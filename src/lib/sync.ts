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

    // PAUSED check removed to allow manual runs. Scheduler filters for ACTIVE only.


    try {
        // Update status to SYNCING
        await db.query('UPDATE connections SET status = $1 WHERE id = $2', ['SYNCING', connectionId]);

        let content = '';
        let fileExtension = 'txt';

        // Fetch Data based on Type
        if (type === 'RSS') {
            const url = source_url;
            if (!url) throw new Error('Source URL missing for RSS connection');
            console.log(`Fetching RSS feed from: ${url}`);
            try {
                const feed = await parser.parseURL(url);
                content = JSON.stringify(feed, null, 2);
                fileExtension = 'json';
            } catch (err) {
                console.warn('RSS parse failed, trying raw fetch...', err);
                const res = await fetch(url);
                content = await res.text();
            }
        } else if (type === 'DATABASE') {
            if (!connection_string || !sql_query) throw new Error('Missing DB config');
            console.log(`Querying remote database...`);

            const decryptedString = decrypt(connection_string);
            const decryptedUser = username ? decrypt(username) : undefined;
            const decryptedPass = password ? decrypt(password) : undefined;

            if (!decryptedUser || !decryptedPass) {
                throw new Error('Missing database credentials.');
            }

            if (decryptedString.startsWith('mysql:')) {
                // MySQL Logic
                const mysql = (await import('mysql2/promise')).default;

                // Parse MySQL connection string manually or use URL
                const dbUrl = new URL(decryptedString);

                const connection = await mysql.createConnection({
                    host: dbUrl.hostname,
                    port: Number(dbUrl.port) || 3306,
                    database: dbUrl.pathname.replace('/', ''),
                    user: decryptedUser,
                    password: decryptedPass
                });

                try {
                    const [rows] = await connection.execute(sql_query);
                    content = JSON.stringify(rows, null, 2);
                    fileExtension = 'json';
                } finally {
                    await connection.end();
                }

            } else {
                // Postgres Logic (Default)
                const parsedConfig = parse(decryptedString);

                // Fix types: pg-connection-string returns nulls, pg Client expects undefined for some fields
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
                    const res = await remoteClient.query(sql_query);
                    content = JSON.stringify(res.rows, (key, value) =>
                        typeof value === 'bigint' ? value.toString() : value
                        , 2);
                    fileExtension = 'json';
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
            content = await res.text();

            const contentType = res.headers.get('content-type') || '';
            const isXml = contentType.includes('xml') || content.trim().startsWith('<');
            const shouldConvert = options?.convertXml !== false; // Default to true if undefined

            if (isXml && shouldConvert) {
                console.log('Detected XML response, converting to JSON...');
                try {
                    const xmlParser = new XMLParser();
                    const jsonObj = xmlParser.parse(content);
                    content = JSON.stringify(jsonObj, null, 2);
                    fileExtension = 'json';
                } catch (err) {
                    console.warn('XML parsing failed, saving as text', err);
                    fileExtension = 'txt';
                }
            } else if (isXml) {
                fileExtension = 'xml';
            } else {
                // Try to format as JSON if possible for prettier saving
                try {
                    const json = JSON.parse(content);
                    content = JSON.stringify(json, null, 2);
                    fileExtension = 'json';
                } catch {
                    fileExtension = 'txt';
                }
            }
        } else {
            content = 'Unsupported connection type.';
        }

        // Save to File (Local or S3)
        const filePath = await saveFile(connectionName, content, fileExtension);
        console.log(`Saved data to: ${filePath}`);

        // Update Status - Preserve PAUSED state if it was paused before sync
        const nextStatus = connection.status === 'PAUSED' ? 'PAUSED' : (connection.schedule ? 'ACTIVE' : 'IDLE');
        await db.query(
            'UPDATE connections SET status = $1, last_synced_at = NOW() WHERE id = $2',
            [nextStatus, connectionId]
        );

        await logEvent(connectionId, connectionName, 'SYNC', 'SUCCESS', 'Sync completed successfully', {
            filePath,
            fileSize: content.length
        });

        // Trigger Pipeline Execution
        try {
            const { runPipeline } = await import('./pipeline/orchestrator');
            // Run asynchronously to not block the response? 
            // Or await it? Usually pipelines might take long. 
            // For this version (Next.js serverless/API), we should ideally use a background job.
            // But for this simple implementation, we will just fire and forget (no await), 
            // OR await if we want to see immediate logs. 
            // Let's await for simplicity in debugging, but catch errors safely.
            await runPipeline(connectionId, filePath);
        } catch (pipelineErr) {
            console.error('Failed to trigger pipeline', pipelineErr);
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
