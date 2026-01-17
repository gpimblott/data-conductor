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
import fs from 'fs/promises';
import { createWriteStream } from 'fs';
import path from 'path';
// @ts-ignore
const JSONStream = require('JSONStream');
import { Stream } from 'stream';

export const fileOutputHandler: NodeHandler = {
    async execute(ctx) {
        console.log('Writing output to file...', ctx.config);

        try {
            console.log('File Output Inputs:', JSON.stringify(ctx.inputs, null, 2));

            const outputDirEnv = process.env.PIPELINE_OUTPUT_DIR || 'data/pipeline_output';
            const outputDir = path.isAbsolute(outputDirEnv)
                ? outputDirEnv
                : path.join(process.cwd(), outputDirEnv);

            // Ensure directory exists
            await fs.mkdir(outputDir, { recursive: true });

            // Generate filename based on config or timestamp
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            let filename = ctx.config.filename || `output-${timestamp}.json`;

            // Simple templating replacement
            filename = filename.replace(/{{timestamp}}/g, timestamp);
            filename = filename.replace(/{{date}}/g, new Date().toISOString().split('T')[0]);

            const filePath = path.join(outputDir, filename);

            const dataToWrite = ctx.inputs[0];

            if (dataToWrite && dataToWrite.filePath) {
                console.log(`Streaming file input from ${dataToWrite.filePath} to output...`);
                // It's a file path reference from the Orchestrator persistence
                const sourcePath = dataToWrite.filePath;
                const { createReadStream } = await import('fs');

                const readStream = createReadStream(sourcePath);
                const writeStream = createWriteStream(filePath);

                await new Promise<void>((resolve, reject) => {
                    readStream.pipe(writeStream)
                        .on('finish', resolve)
                        .on('error', reject);
                    readStream.on('error', reject);
                });

            } else if (dataToWrite && (dataToWrite instanceof Stream || (dataToWrite.pipe && typeof dataToWrite.pipe === 'function'))) {
                console.log('Streaming output to file...');
                const writeStream = createWriteStream(filePath);

                // Pipe Input Stream -> JSON Stringify Stream -> File Write Stream
                // We use JSONStream.stringify() which turns object stream into valid JSON array string '[{},{}]'
                const jsonStream = JSONStream.stringify();

                await new Promise<void>((resolve, reject) => {
                    dataToWrite
                        .pipe(jsonStream)
                        .pipe(writeStream)
                        .on('finish', resolve)
                        .on('error', reject);

                    // Handle errors on intermediate streams
                    dataToWrite.on('error', reject);
                    jsonStream.on('error', reject);
                });

            } else {
                // Static Data Fallback
                const content = typeof dataToWrite === 'string'
                    ? dataToWrite
                    : JSON.stringify(dataToWrite || { error: 'No input' }, null, 2);

                await fs.writeFile(filePath, content, 'utf-8');
            }

            console.log(`Successfully wrote to ${filePath}`);

            return {
                success: true,
                output: {
                    saved: true,
                    destination: 'file',
                    path: filePath
                }
            };
        } catch (error: any) {
            console.error('Failed to write execution output:', error);
            return {
                success: false,
                error: `Failed to write file: ${error.message}`
            };
        }
    }
};
