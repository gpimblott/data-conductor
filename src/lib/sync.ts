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

import { logEvent } from '@/lib/logger';
import Parser from 'rss-parser';
import { db } from './db';
import { decrypt } from './crypto';
import { Connection } from '@/types';
import { Client } from 'pg';
import { parse } from 'pg-connection-string';
import { XMLParser } from 'fast-xml-parser';
import { saveFile } from './storage';
import { addJob } from './queue/jobQueue';
import { Readable } from 'stream';
// @ts-ignore
import JSONStream from 'JSONStream';
import QueryStream from 'pg-query-stream';
// @ts-ignore
import { Readable as ReadableWeb } from 'stream/web';

const parser = new Parser();

import { syncRegistry } from './pipeline/nodes/sync';

export async function syncConnection(connectionId: string) {
    console.log(`Starting sync for connection: ${connectionId}`);

    // Fetch connection details
    const { rows } = await db.query(
        `SELECT c.*, 
                r.source_url, 
                d.connection_string, d.sql_query, d.username, d.password
         FROM connections c
         LEFT JOIN rss_connections r ON c.id = r.connection_id
         LEFT JOIN database_connections d ON c.id = d.connection_id
         WHERE c.id = $1`,
        [connectionId]
    );

    if (rows.length === 0) {
        throw new Error('Connection not found');
    }

    const connection = rows[0];
    const { type, name } = connection;
    const connectionName = name || 'Unknown';

    await logEvent(connectionId, connectionName, 'SYNC', 'INFO', 'Sync started');

    try {
        // Update status to SYNCING
        await db.query('UPDATE connections SET status = $1 WHERE id = $2', ['SYNCING', connectionId]);

        // Hand off to Sync Handler
        const handler = syncRegistry[type];
        if (!handler) {
            throw new Error(`Unsupported connection type: ${type}`);
        }

        const result = await handler.execute(connection);

        const filePath = await saveFile(connectionName, result.data, result.extension);
        const fileSize = result.fileSize || 0;

        console.log(`Saved data to: ${filePath}`);

        // Update Status - Preserve PAUSED state if it was paused before sync
        const nextStatus = connection.status === 'PAUSED' ? 'PAUSED' : (connection.schedule ? 'ACTIVE' : 'IDLE');
        await db.query(
            'UPDATE connections SET status = $1, last_synced_at = NOW(), last_sync_size = $2 WHERE id = $3',
            [nextStatus, fileSize, connectionId]
        );

        await logEvent(connectionId, connectionName, 'SYNC', 'SUCCESS', 'Sync completed successfully', {
            filePath,
            fileSize
        });

        // Trigger Pipeline Execution (Queued)
        try {
            const { runPipeline } = await import('./pipeline/orchestrator');
            // Find pipeline for this connection
            const { rows: pipeRows } = await db.query('SELECT id FROM pipelines WHERE connection_id = $1 ORDER BY created_at DESC LIMIT 1', [connectionId]);

            if (pipeRows.length > 0) {
                addJob(() => runPipeline(pipeRows[0].id, filePath));
            } else {
                console.log(`No pipeline found to trigger for connection ${connectionId}`);
            }
        } catch (pipelineErr) {
            console.error('Failed to queue pipeline', pipelineErr);
        }

        return { success: true };

    } catch (error: any) {
        console.error('Sync failed:', error);
        await db.query(
            'UPDATE connections SET status = $1 WHERE id = $2',
            ['ERROR', connectionId]
        );

        await logEvent(connectionId, connectionName, 'SYNC', 'FAILURE', 'Sync failed', {
            error: error.message,
            stack: error.stack
        });

        throw error;
    }
}
