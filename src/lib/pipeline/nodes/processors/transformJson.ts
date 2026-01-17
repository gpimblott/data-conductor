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
import jsonata from 'jsonata';
import { Transform } from 'stream';
import fs from 'fs';
import JSONStream from 'JSONStream';

export const transformJsonHandler: NodeHandler = {
    async execute(ctx) {
        console.log('Transforming JSON...', ctx.config);

        try {
            const inputRef = ctx.inputs[0];
            if (!inputRef || !inputRef.filePath) {
                throw new Error('No input file provided for transformation');
            }

            const filePath = inputRef.filePath;
            if (!fs.existsSync(filePath)) {
                throw new Error(`Input file not found: ${filePath}`);
            }

            let expressionString = '';

            // Handle "Simple" Mode (Mapping Rules)
            if (ctx.config.mode === 'simple' && ctx.config.rules && Array.isArray(ctx.config.rules)) {
                const mappings = ctx.config.rules
                    .filter((r: any) => r.target && r.source)
                    .map((r: any) => `"${r.target}": ${r.source}`)
                    .join(', ');
                expressionString = `{ ${mappings} }`;
            }
            // Handle "Advanced" Mode (Raw Expression)
            else if (ctx.config.expression) {
                expressionString = ctx.config.expression;
            } else {
                // Passthrough if no config - just open read stream
                return { success: true, output: fs.createReadStream(filePath) };
            }

            console.log(`Applying JSONata expression: ${expressionString}`);
            const expression = jsonata(expressionString);

            // Create Transform Stream
            const transformStream = new Transform({
                objectMode: true,
                async transform(chunk, encoding, callback) {
                    try {
                        const result = await expression.evaluate(chunk);
                        if (result !== undefined) {
                            this.push(result);
                        }
                        callback();
                    } catch (err: any) {
                        console.error('Error transforming chunk:', err);
                        callback(err);
                    }
                }
            });

            // Read File -> Parse JSON Array -> Transform -> (Orchestrator saves result)
            // We assume input file is a JSON array or compatible stream of objects.
            // Using JSONStream.parse('*') assumes top level array.
            const inputStream = fs.createReadStream(filePath, { encoding: 'utf8' })
                .pipe(JSONStream.parse('*'));

            inputStream.pipe(transformStream);

            return {
                success: true,
                output: transformStream
            };

        } catch (error: any) {
            console.error('Transformation failed:', error);
            return {
                success: false,
                error: `Transformation failed: ${error.message}`
            };
        }
    }
};
