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
import path from 'path';

export const fileOutputHandler: NodeHandler = {
    async execute(ctx) {
        console.log('Writing output to file...', ctx.config);

        try {
            console.log('File Output Inputs:', JSON.stringify(ctx.inputs, null, 2));

            const dataToWrite = ctx.inputs[0] !== undefined ? ctx.inputs[0] : { error: 'No input data received' };
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

            // Ensure .json extension if not present (optional, but good practice, though user might want handling)
            // Let's stick to just replacing placeholders for now.
            const filePath = path.join(outputDir, filename);

            const content = typeof dataToWrite === 'string'
                ? dataToWrite
                : JSON.stringify(dataToWrite, null, 2);

            await fs.writeFile(filePath, content, 'utf-8');
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
