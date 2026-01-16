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


import { db } from '../lib/db';

async function main() {
    const client = await db.connect();
    try {
        console.log('Connected to DB');

        // 1. Get a connection to test with (or create a dummy one)
        const res = await client.query('SELECT id, name, type FROM connections LIMIT 1');
        if (res.rows.length === 0) {
            console.log('No connections found to test delete.');
            return;
        }

        const conn = res.rows[0];
        console.log('Testing delete on:', conn);
        const id = conn.id;

        await client.query('BEGIN');

        console.log('Refetching name...');
        const nameRes = await client.query('SELECT name FROM connections WHERE id = $1', [id]);
        if (nameRes.rows.length === 0) console.log('Connection not found (in transaction)');

        console.log('Deleting from connection_logs...');
        await client.query('DELETE FROM connection_logs WHERE connection_id = $1', [id]);

        console.log('Deleting from rss_connections...');
        await client.query('DELETE FROM rss_connections WHERE connection_id = $1', [id]);

        console.log('Deleting from database_connections...');
        await client.query('DELETE FROM database_connections WHERE connection_id = $1', [id]);

        console.log('Deleting from connections...');
        await client.query('DELETE FROM connections WHERE id = $1', [id]);

        console.log('DELETE SUCCESSFUL (Rolling back to save data)');
        await client.query('ROLLBACK');

    } catch (err) {
        console.error('DELETE FAILED:', err);
        await client.query('ROLLBACK');
    } finally {
        client.release();
        process.exit(0);
    }
}

main().catch(console.error);
