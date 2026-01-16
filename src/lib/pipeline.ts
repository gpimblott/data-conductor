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

import { exec } from 'child_process';
import path from 'path';
import fs from 'fs';
import { logEvent } from './logger';
import util from 'util';

const execPromise = util.promisify(exec);

export async function findLatestDownload(connectionName: string): Promise<string | null> {
    const sanitizeName = (name: string) => name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    const baseDir = process.env.DATA_DIR || './data';
    const dirPath = path.join(baseDir, 'downloads', sanitizeName(connectionName));

    if (!fs.existsSync(dirPath)) {
        return null;
    }

    const files = fs.readdirSync(dirPath)
        .filter(f => !f.startsWith('.'))
        .map(f => ({
            name: f,
            time: fs.statSync(path.join(dirPath, f)).mtime.getTime()
        }))
        .sort((a, b) => b.time - a.time);

    if (files.length === 0) return null;

    return path.join(dirPath, files[0].name);
}

export async function runEntityPipeline(connectionId: string, connectionName: string, inputFilePath: string): Promise<{ success: boolean; output?: string; error?: string }> {
    try {
        await logEvent(connectionId, connectionName, 'PIPELINE', 'INFO', 'Starting entity pipeline...');

        const pipelineDir = path.resolve(process.cwd(), '../entity-pipeline');
        const venvPython = path.join(pipelineDir, 'venv/bin/python');
        const mainScript = path.join(pipelineDir, 'main.py');
        const configPath = path.join(pipelineDir, 'config.yaml');
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const outputFilename = `${timestamp}_${path.basename(inputFilePath, path.extname(inputFilePath))}_output.json`;
        const outputPath = path.resolve(process.cwd(), 'data/pipeline_output', outputFilename);

        // Ensure output dir exists
        const outputDir = path.dirname(outputPath);
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }

        const command = `${venvPython} ${mainScript} --config ${configPath} --input "${inputFilePath}" --output "${outputPath}"`;

        console.log(`Executing pipeline: ${command}`);

        const { stdout, stderr } = await execPromise(command);

        if (stderr) {
            console.warn('Pipeline stderr:', stderr);
        }

        await logEvent(connectionId, connectionName, 'PIPELINE', 'SUCCESS', 'Pipeline completed', {
            stdout,
            outputPath
        });

        return { success: true, output: stdout };

    } catch (error: any) {
        console.error('Pipeline execution failed:', error);
        await logEvent(connectionId, connectionName, 'PIPELINE', 'FAILURE', 'Pipeline failed', {
            message: error.message,
            stack: error.stack
        });
        return { success: false, error: error.message };
    }
}
