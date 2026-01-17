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

import { NodeHandler } from '../registry';
import { Client } from 'pg';
// import { get } from 'lodash'; // Removed to avoid installing unused dep

// Simple deep get implementation if lodash not available
function getPath(obj: any, path: string, defaultValue?: any) {
    // Convert indexes to properties (e.g., items[0].id -> items.0.id)
    const keys = path.replace(/\[(\d+)\]/g, '.$1').split('.');
    let result = obj;
    for (const key of keys) {
        if (result === undefined || result === null) {
            return defaultValue;
        }
        result = result[key];
    }
    return result === undefined ? defaultValue : result;
}

export const postgresDestinationHandler: NodeHandler = {
    async execute(ctx) {
        console.log('Postgres Destination: Starting execution', {
            host: ctx.config.host,
            db: ctx.config.database,
            table: ctx.config.table
        });

        const inputRef = ctx.inputs[0];
        if (!inputRef || !inputRef.filePath) {
            return { success: false, error: 'No input file provided' };
        }

        const filePath = inputRef.filePath;

        const client = new Client({
            host: ctx.config.host,
            port: ctx.config.port || 5432,
            database: ctx.config.database,
            user: ctx.config.user,
            password: ctx.config.password,
            // ssl: { rejectUnauthorized: false } 
        });

        try {
            await client.connect();
            console.log('Postgres Destination: Connected to DB');

            const table = ctx.config.table;
            const mapping = ctx.config.mapping || [];

            if (!table || mapping.length === 0) {
                throw new Error('Table or mapping configuration missing');
            }

            let insertedCount = 0;

            const processItem = async (item: any) => {
                const columns: string[] = [];
                const values: any[] = [];
                const placeholders: string[] = [];

                mapping.forEach((map: any, index: number) => {
                    if (map.column && map.sourcePath) {
                        columns.push(map.column);
                        const val = getPath(item, map.sourcePath);
                        values.push(val === undefined ? null : val);
                        placeholders.push(`$${index + 1}`);
                    }
                });

                if (columns.length > 0) {
                    const query = `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders.join(', ')})`;
                    await client.query(query, values);
                    insertedCount++;
                }
            };

            // Read File and Stream to DB
            // Using JSONStream to parse output array from previous node
            const fs = require('fs');
            const JSONStream = require('JSONStream');

            const fileStream = fs.createReadStream(filePath, { encoding: 'utf8' });
            const parseStream = JSONStream.parse('*');

            // We need to wait for stream to finish
            await new Promise<void>((resolve, reject) => {
                fileStream.pipe(parseStream);

                parseStream.on('data', async (item: any) => {
                    // Pause stream to handle async DB insert? 
                    // Postgres client might handle concurrency but let's be safe or just fire and forget might flood it.
                    // Ideally we use a transform stream or careful await.
                    // For now, simpler approach: buffering is handled by node streams somewhat, but 'data' event is fast.
                    // Pausing is better.
                    parseStream.pause();
                    try {
                        await processItem(item);
                        parseStream.resume();
                    } catch (err) {
                        parseStream.emit('error', err);
                    }
                });

                parseStream.on('end', () => resolve());
                parseStream.on('error', (err: any) => reject(err));
                fileStream.on('error', (err: any) => reject(err));
            });

            console.log(`Postgres Destination: Inserted ${insertedCount} rows`);
            await client.end();

            return {
                success: true,
                output: {
                    destination: 'postgres',
                    inserted: insertedCount,
                    table: table
                }
            };

        } catch (error: any) {
            console.error('Postgres Destination Error:', error);
            try { await client.end(); } catch (e) { } // Ensure cleanup
            return {
                success: false,
                error: `Postgres Error: ${error.message}`
            };
        }
    }
};
