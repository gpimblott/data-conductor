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
import { createJsonInputStream } from '../../streamUtils';

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

export const mysqlDestinationHandler: NodeHandler = {
    async execute(ctx) {
        console.log('MySQL Destination: Starting execution', {
            host: ctx.config.host,
            db: ctx.config.database,
            table: ctx.config.table
        });

        const inputData = ctx.inputs[0];
        if (!inputData) {
            return { success: false, error: 'No input data received' };
        }

        const mysql = (await import('mysql2/promise')).default;

        const connection = await mysql.createConnection({
            host: ctx.config.host,
            port: ctx.config.port || 3306,
            database: ctx.config.database,
            user: ctx.config.user,
            password: ctx.config.password,
            // ssl: { rejectUnauthorized: false } // Typical for cloud DBs
        });

        try {
            console.log('MySQL Destination: Connected to DB');

            const table = ctx.config.table;
            const mapping = ctx.config.mapping || [];

            if (!table || mapping.length === 0) {
                throw new Error('Table or mapping configuration missing');
            }

            // Normalize input to array
            const dataArray = Array.isArray(inputData) ? inputData : [inputData];

            let insertedCount = 0;

            const processItem = async (item: any) => {
                const columns: string[] = [];
                const values: any[] = [];
                const placeholders: string[] = [];

                mapping.forEach((map: any) => {
                    if (map.column && map.sourcePath) {
                        columns.push(map.column);
                        const val = getPath(item, map.sourcePath);
                        // FIX: Convert undefined to null for MySQL
                        values.push(val === undefined ? null : val);
                        placeholders.push('?');
                    }
                });

                if (columns.length > 0) {
                    const query = `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders.join(', ')})`;
                    await connection.execute(query, values);
                }
            };

            // Handle File-based Input (New Architecture)
            // Handle File-based Input (New Architecture)
            if (inputData && inputData.filePath) {
                console.log(`MySQL Destination: Reading input from ${inputData.filePath}`);

                const dataStream = await createJsonInputStream(inputData.filePath);

                await new Promise<void>((resolve, reject) => {
                    dataStream.on('data', async (item: any) => {
                        // Pause to handle async insert (backpressure simulation)
                        dataStream.pause();
                        try {
                            await processItem(item);
                            insertedCount++;
                            dataStream.resume();
                        } catch (err) {
                            dataStream.emit('error', err);
                        }
                    });

                    dataStream.on('end', () => resolve());
                    dataStream.on('error', (err: any) => reject(err));
                });
            }
            // Handle Legacy Stream Input (In-memory)
            // @ts-ignore
            else if (inputData && (inputData.pipe || inputData instanceof require('stream').Stream)) {
                console.log('MySQL Destination: Processing Stream input');
                for await (const item of inputData) {
                    await processItem(item);
                    insertedCount++;
                }
            } else {
                // Static Data Fallback
                const dataArray = Array.isArray(inputData) ? inputData : [inputData];
                for (const item of dataArray) {
                    await processItem(item);
                    insertedCount++;
                }
            }

            console.log(`MySQL Destination: Inserted ${insertedCount} rows`);
            await connection.end();

            return {
                success: true,
                output: {
                    destination: 'mysql',
                    inserted: insertedCount,
                    table: table
                }
            };

        } catch (error: any) {
            console.error('MySQL Destination Error:', error);
            try { await connection.end(); } catch (e) { } // Ensure cleanup
            return {
                success: false,
                error: `MySQL Error: ${error.message}`
            };
        }
    }
};
