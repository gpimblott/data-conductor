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

        const inputData = ctx.inputs[0];
        if (!inputData) {
            return { success: false, error: 'No input data received' };
        }

        const client = new Client({
            host: ctx.config.host,
            port: ctx.config.port || 5432,
            database: ctx.config.database,
            user: ctx.config.user,
            password: ctx.config.password,
            // ssl: { rejectUnauthorized: false } // Typical for cloud DBs, might need config
        });

        try {
            await client.connect();
            console.log('Postgres Destination: Connected to DB');

            const table = ctx.config.table;
            const mapping = ctx.config.mapping || [];

            if (!table || mapping.length === 0) {
                throw new Error('Table or mapping configuration missing');
            }

            // Normalize input to array
            const dataArray = Array.isArray(inputData) ? inputData : [inputData];

            // If the input is actually an object with an 'items' array (common in RSS feeds), utilize that?
            // BUT: Transform node usually outputs the relevant array. 
            // Let's assume input is the data we want to insert.

            let insertedCount = 0;

            for (const item of dataArray) {
                const columns: string[] = [];
                const values: any[] = [];
                const placeholders: string[] = [];

                mapping.forEach((map: any, index: number) => {
                    if (map.column && map.sourcePath) {
                        columns.push(map.column);
                        const val = getPath(item, map.sourcePath);
                        values.push(val);
                        placeholders.push(`$${index + 1}`);
                    }
                });

                if (columns.length > 0) {
                    const query = `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders.join(', ')})`;
                    // console.log('Executing:', query, values);
                    await client.query(query, values);
                    insertedCount++;
                }
            }

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
