/*
 * DataConductor
 * Copyright (C) 2026
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { encrypt, decrypt } from '@/lib/crypto';
import { logEvent } from '@/lib/logger';

export async function PUT(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const client = await db.connect();
    try {
        const { id } = await params;
        const body = await request.json();
        const { name, type, sourceUrl, connectionString, sqlQuery, schedule, status, options } = body;
        const optionsJson = options || {};

        if (!name || !type) {
            return NextResponse.json({ error: 'Name and Type are required' }, { status: 400 });
        }

        await client.query('BEGIN');

        // Determine New Status
        // If specific status requested (e.g. PAUSED/ACTIVE), use it.
        // Otherwise, re-calculate based on schedule (default behavior for edits).
        let newStatus = status;
        if (!newStatus) {
            newStatus = schedule ? 'ACTIVE' : 'IDLE';
        }

        // 1. Update Parent
        const { rows } = await client.query(
            `UPDATE connections 
             SET name = $1, type = $2, schedule = $3, status = $4, options = $5
             WHERE id = $6
             RETURNING id, name, type, status, last_synced_at, schedule, options`,
            [name, type, schedule || null, newStatus, optionsJson, id]
        );

        if (rows.length === 0) {
            await client.query('ROLLBACK');
            return NextResponse.json({ error: 'Connection not found' }, { status: 404 });
        }
        const connection = rows[0];

        // 2. Update/Insert Child based on Type
        // Note: Changing type might require deleting from one child table and inserting to another.
        // For simplicity, let's assume we handle the current type.
        // Ideally we should delete from both child tables for this ID and insert into the new one.

        // 2. Fetch existing password (if DATABASE type) before deleting
        let existingEncryptedPassword = null;
        if (type === 'DATABASE') {
            const res = await client.query('SELECT password FROM database_connections WHERE connection_id = $1', [id]);
            if (res.rows.length > 0) {
                existingEncryptedPassword = res.rows[0].password;
            }
        }

        await client.query('DELETE FROM rss_connections WHERE connection_id = $1', [id]);
        await client.query('DELETE FROM database_connections WHERE connection_id = $1', [id]);

        if (type === 'RSS' || type === 'HTTP') {
            if (!sourceUrl) throw new Error(`Source URL required for ${type}`);
            await client.query(
                `INSERT INTO rss_connections (connection_id, source_url) VALUES ($1, $2)`,
                [id, sourceUrl]
            );
            connection.source_url = sourceUrl;
        } else if (type === 'DATABASE') {
            const { username, password } = body;
            if (!connectionString || !sqlQuery) throw new Error('Connection String and Query required');

            const encryptedConnectionString = encrypt(connectionString);
            const encryptedUsername = username ? encrypt(username) : null;
            // Use new password if provided, otherwise fallback to existing
            const finalEncryptedPassword = password ? encrypt(password) : existingEncryptedPassword;

            await client.query(
                `INSERT INTO database_connections (connection_id, connection_string, sql_query, username, password) VALUES ($1, $2, $3, $4, $5)`,
                [id, encryptedConnectionString, sqlQuery, encryptedUsername, finalEncryptedPassword]
            );
            connection.connection_string = encryptedConnectionString;
            connection.sql_query = sqlQuery;
            connection.username = encryptedUsername;
        }

        await client.query('COMMIT');



        // ...

        const updatedConnection = {
            id: connection.id,
            name: connection.name,
            type: connection.type,
            sourceUrl: sourceUrl,
            connectionString: connectionString,
            sqlQuery: sqlQuery,
            status: connection.status,
            username: connection.username ? decrypt(connection.username) : undefined,
            lastSyncedAt: connection.last_synced_at,
            schedule: connection.schedule,
            options: connection.options
        };

        await logEvent(updatedConnection.id, updatedConnection.name, 'UPDATE', 'SUCCESS', 'Connection updated successfully');

        return NextResponse.json(updatedConnection);
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error updating connection:', error);
        return NextResponse.json(
            { error: 'Failed to update connection' },
            { status: 500 }
        );
    } finally {
        client.release();
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const client = await db.connect();
    let committed = false;
    try {
        const { id } = await params;

        // Fetch connection details for logging before deletion
        const { rows } = await client.query('SELECT name FROM connections WHERE id = $1', [id]);
        if (rows.length === 0) {
            return NextResponse.json({ error: 'Connection not found' }, { status: 404 });
        }
        const connectionName = rows[0].name;

        await client.query('BEGIN');

        // Explicitly delete dependencies to ensure clean removal
        await client.query('DELETE FROM connection_logs WHERE connection_id = $1', [id]);
        await client.query('DELETE FROM rss_connections WHERE connection_id = $1', [id]);
        await client.query('DELETE FROM database_connections WHERE connection_id = $1', [id]);
        await client.query('DELETE FROM connections WHERE id = $1', [id]);

        await client.query('COMMIT');
        committed = true;

        await logEvent(null, connectionName, 'DELETE', 'SUCCESS', 'Connection deleted successfully');

        return NextResponse.json({ success: true });
    } catch (error) {
        if (!committed) {
            await client.query('ROLLBACK');
        }
        console.error('Delete error:', error);

        // If we already committed, we should return success (or partial success warning)
        // because the main action (delete) was completed.
        if (committed) {
            return NextResponse.json({ success: true, warning: 'Deleted but logging failed' });
        }

        const errorMessage = error instanceof Error ? error.message : String(error);
        return NextResponse.json({ error: `Failed to delete: ${errorMessage}` }, { status: 500 });
    } finally {
        client.release();
    }
}
