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

export async function GET() {
    try {
        const { rows } = await db.query(
            `SELECT c.*, 
                    r.source_url, 
                    d.connection_string, d.sql_query, d.username,
                    (
                        SELECT details->>'fileSize'
                        FROM connection_logs cl
                        WHERE cl.connection_id = c.id
                          AND cl.event_type = 'SYNC'
                          AND cl.status = 'SUCCESS'
                          AND cl.details->>'fileSize' IS NOT NULL
                        ORDER BY cl.created_at DESC
                        LIMIT 1
                    ) as last_sync_size,
                    (
                        SELECT json_agg(status)
                        FROM (
                            SELECT status 
                            FROM connection_logs cl 
                            WHERE cl.connection_id = c.id 
                            AND cl.event_type = 'SYNC' 
                            AND cl.status IN ('SUCCESS', 'FAILURE')
                            ORDER BY cl.created_at DESC 
                            LIMIT 5
                        ) as recent_logs
                    ) as recent_sync_statuses
             FROM connections c
             LEFT JOIN rss_connections r ON c.id = r.connection_id
             LEFT JOIN database_connections d ON c.id = d.connection_id
             ORDER BY c.created_at DESC`
        );

        // Map snake_case DB columns to camelCase API response
        const connections = rows.map(row => ({
            id: row.id,
            name: row.name,
            type: row.type,
            sourceUrl: row.source_url, // From RSS table
            connectionString: row.connection_string ? decrypt(row.connection_string) : undefined, // From DB table
            sqlQuery: row.sql_query, // From DB table
            username: row.username ? decrypt(row.username) : undefined, // Decrypt username for UI
            status: row.status,
            lastSyncedAt: row.last_synced_at,
            lastSyncSize: row.last_sync_size ? parseInt(row.last_sync_size, 10) : undefined,
            recentSyncStatuses: row.recent_sync_statuses || [],
            schedule: row.schedule,
            options: row.options || {}
        }));

        return NextResponse.json(connections);
    } catch (error) {
        console.error('Database error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch connections' },
            { status: 500 }
        );
    }
}

export async function POST(request: Request) {
    const client = await db.connect();
    try {
        const body = await request.json();
        const { name, type, sourceUrl, connectionString, sqlQuery, schedule } = body;

        if (!name || !type) {
            return NextResponse.json({ error: 'Name and Type are required' }, { status: 400 });
        }

        await client.query('BEGIN');

        // Determine initial status
        const initialStatus = schedule ? 'ACTIVE' : 'IDLE';

        // 1. Insert Parent
        const { rows } = await client.query(
            `INSERT INTO connections (name, type, status, schedule, options) 
             VALUES ($1, $2, $3, $4, $5) 
             RETURNING id, name, type, status, last_synced_at, schedule, options`,
            [name, type, initialStatus, schedule || null, body.options || {}]
        );
        const connection = rows[0];

        // 2. Insert Child based on Type
        if (type === 'RSS' || type === 'HTTP') {
            if (!sourceUrl) throw new Error(`Source URL required for ${type}`);
            // Reuse rss_connections table for now as it holds source_url
            await client.query(
                `INSERT INTO rss_connections (connection_id, source_url) VALUES ($1, $2)`,
                [connection.id, sourceUrl]
            );
            connection.source_url = sourceUrl;
        } else if (type === 'DATABASE') {
            const { username, password } = body;
            if (!connectionString || !sqlQuery) throw new Error('Connection String and Query required for Database');

            const encryptedConnectionString = encrypt(connectionString);
            const encryptedUsername = username ? encrypt(username) : null;
            const encryptedPassword = password ? encrypt(password) : null;

            await client.query(
                `INSERT INTO database_connections (connection_id, connection_string, sql_query, username, password) VALUES ($1, $2, $3, $4, $5)`,
                [connection.id, encryptedConnectionString, sqlQuery, encryptedUsername, encryptedPassword]
            );
            connection.connection_string = encryptedConnectionString;
            connection.sql_query = sqlQuery;
            connection.username = encryptedUsername;
            // Password not returned
        }

        await client.query('COMMIT');



        // ... (existing code)

        const newConnection = {
            id: connection.id,
            name: connection.name,
            type: connection.type,
            sourceUrl: sourceUrl,
            connectionString: connectionString,
            sqlQuery: sqlQuery,
            username: connection.username ? decrypt(connection.username) : undefined,
            status: connection.status,
            lastSyncedAt: connection.last_synced_at,
            schedule: connection.schedule,
            options: connection.options
        };

        await logEvent(newConnection.id, newConnection.name, 'CREATE', 'SUCCESS', 'Connection created successfully');

        return NextResponse.json(newConnection, { status: 201 });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Database error:', error);
        return NextResponse.json(
            { error: 'Failed to create connection' },
            { status: 500 }
        );
    } finally {
        client.release();
    }
}
