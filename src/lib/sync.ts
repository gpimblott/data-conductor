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
    const { type, name, source_url, connection_string, sql_query, username, password, schedule, options } = connection;
    const connectionName = name || 'Unknown';

    await logEvent(connectionId, connectionName, 'SYNC', 'INFO', 'Sync started');

    try {
        // Update status to SYNCING
        await db.query('UPDATE connections SET status = $1 WHERE id = $2', ['SYNCING', connectionId]);

        let filePath = '';
        let fileSize = 0;

        // Fetch Data based on Type
        if (type === 'RSS') {
            const url = source_url;
            if (!url) throw new Error('Source URL missing for RSS connection');
            console.log(`Fetching RSS feed from: ${url}`);

            let content = '';
            let ext = 'json';
            try {
                const feed = await parser.parseURL(url);
                content = JSON.stringify(feed, null, 2);
            } catch (err) {
                console.warn('RSS parse failed, trying raw fetch...', err);
                const res = await fetch(url);
                content = await res.text();
                ext = 'txt';
            }
            // RSS is small, so string buffer is acceptable for now
            filePath = await saveFile(connectionName, content, ext);
            fileSize = content.length;

        } else if (type === 'DATABASE') {
            if (!connection_string || !sql_query) throw new Error('Missing DB config');
            console.log(`Querying remote database (streaming)...`);

            const decryptedString = decrypt(connection_string);
            const decryptedUser = username ? decrypt(username) : undefined;
            const decryptedPass = password ? decrypt(password) : undefined;

            if (!decryptedUser || !decryptedPass) {
                throw new Error('Missing database credentials.');
            }

            if (decryptedString.startsWith('mysql:')) {
                // MySQL Logic
                const mysql = (await import('mysql2')).default; // Use standard mysql2 for streaming support if promise version lacks it
                // Note: mysql2/promise `query` returns result, standard mysql2 `query` returns event emitter for streaming.
                // Reverting to standard mysql2 for streaming capability.

                const dbUrl = new URL(decryptedString);
                const connection = mysql.createConnection({
                    host: dbUrl.hostname,
                    port: Number(dbUrl.port) || 3306,
                    database: dbUrl.pathname.replace('/', ''),
                    user: decryptedUser,
                    password: decryptedPass
                });

                // Wrap in promise to handle connection/stream
                await new Promise<void>((resolve, reject) => {
                    connection.connect(async (err) => {
                        if (err) return reject(err);

                        try {
                            const query = connection.query(sql_query);
                            const stream = query.stream();

                            // Pipe rows -> JSON array stream -> File
                            const jsonStream = stream.pipe(JSONStream.stringify());

                            filePath = await saveFile(connectionName, jsonStream as unknown as Readable, 'json');
                            // Start counting size? Hard with stream unless we spy. 
                            // For now set size to 0 or check file stat later?
                            // Let's rely on success.
                            fileSize = 0;

                            connection.end();
                            resolve();
                        } catch (e) {
                            connection.end();
                            reject(e);
                        }
                    });
                });

            } else {
                // Postgres Logic (Default)
                const parsedConfig = parse(decryptedString);
                const cleanConfig = Object.fromEntries(
                    Object.entries(parsedConfig).map(([k, v]) => [k, v === null ? undefined : v])
                );

                const remoteClient = new Client({
                    ...cleanConfig,
                    user: decryptedUser,
                    password: decryptedPass
                });

                await remoteClient.connect();
                try {
                    const query = new QueryStream(sql_query);
                    const stream = remoteClient.query(query);

                    const jsonStream = stream.pipe(JSONStream.stringify());

                    filePath = await saveFile(connectionName, jsonStream as unknown as Readable, 'json');
                    fileSize = 0; // Unknown due to stream
                } finally {
                    await remoteClient.end();
                }
            }
        } else if (type === 'HTTP') {
            const url = source_url;
            if (!url) throw new Error('Source URL missing for HTTP connection');
            console.log(`Fetching from HTTP: ${url}`);

            const res = await fetch(url);
            if (!res.ok) {
                throw new Error(`HTTP fetch failed with status ${res.status}: ${res.statusText}`);
            }

            const contentType = res.headers.get('content-type') || '';
            const isXml = contentType.includes('xml');
            const shouldConvert = options?.convertXml !== false;

            if (isXml && shouldConvert) {
                // For XML Conversion, we still buffer for now as we lack streaming XML-to-JSON
                console.log('Detected XML response, buffering and converting...');
                const text = await res.text();
                try {
                    const xmlParser = new XMLParser();
                    const jsonObj = xmlParser.parse(text);
                    const jsonStr = JSON.stringify(jsonObj, null, 2);
                    filePath = await saveFile(connectionName, jsonStr, 'json');
                    fileSize = jsonStr.length;
                } catch (err) {
                    console.warn('XML parsing failed, saving raw text', err);
                    filePath = await saveFile(connectionName, text, 'txt');
                    fileSize = text.length;
                }
            } else {
                // Stream everything else (JSON, CSV, etc.)
                // Readable.fromWeb required for Node < 20 or consistency
                // @ts-ignore
                const nodeStream = Readable.fromWeb(res.body);
                // We default to JSON extension if json type, else txt?
                // Or try to detect?
                const ext = contentType.includes('json') ? 'json' : 'txt';

                filePath = await saveFile(connectionName, nodeStream, ext);
                fileSize = 0; // Streamed
            }
        } else {
            throw new Error('Unsupported connection type.');
        }

        console.log(`Saved data to: ${filePath}`);

        // Update Status - Preserve PAUSED state if it was paused before sync
        const nextStatus = connection.status === 'PAUSED' ? 'PAUSED' : (connection.schedule ? 'ACTIVE' : 'IDLE');
        await db.query(
            'UPDATE connections SET status = $1, last_synced_at = NOW(), last_sync_size = $2 WHERE id = $3',
            [nextStatus, fileSize || 0, connectionId]
        );

        await logEvent(connectionId, connectionName, 'SYNC', 'SUCCESS', 'Sync completed successfully', {
            filePath,
            fileSize
        });

        // Trigger Pipeline Execution (Queued)
        try {
            const { runPipeline } = await import('./pipeline/orchestrator');
            addJob(() => runPipeline(connectionId, filePath));
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
