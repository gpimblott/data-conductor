/*
 * DataConductor
 * Copyright (C) 2026
 */

import fs from 'fs';
import JSONStream from 'JSONStream';

export interface NodeExecutionContext {
    nodeId: string;
    config: any;
    inputs: any[];
}

export interface NodeExecutionResult {
    success: boolean;
    output?: any;
    error?: string;
}

export interface NodeHandler {
    execute(context: NodeExecutionContext): Promise<NodeExecutionResult>;
}

// Basic Handlers

const sourceHandler: NodeHandler = {
    async execute(ctx) {
        console.log('Executing Source Node (Streaming)...');

        // Orchestrator seeds the source node with { filePath: string }
        const input = ctx.inputs[0];

        if (input && input.filePath) {
            try {
                // Ensure file exists
                if (!fs.existsSync(input.filePath)) {
                    throw new Error(`Source file not found: ${input.filePath}`);
                }

                // Create Stream
                // Check if file is an Object (needs items.*) or Array (needs *)
                const fd = fs.openSync(input.filePath, 'r');
                const buffer = Buffer.alloc(100);
                fs.readSync(fd, buffer, 0, 100, 0);
                fs.closeSync(fd);

                const header = buffer.toString('utf8').trim();
                const isObject = header.startsWith('{');

                // If it's an object (like RSS output), we assume data is in 'items' array
                const selector = isObject ? 'items.*' : '*';
                console.log(`Source Node: Detected ${isObject ? 'Object' : 'Array'} input, using selector '${selector}'`);

                const stream = fs.createReadStream(input.filePath, { encoding: 'utf8' })
                    .pipe(JSONStream.parse(selector));

                return { success: true, output: stream };

            } catch (err: any) {
                return { success: false, error: `Failed to read source file: ${err.message}` };
            }
        }

        // Fallback or Error if no file path
        return { success: false, error: 'No source file path provided to Source Node' };
    }
};

import { restApiHandler } from './processors/restApi';
import { transformJsonHandler } from './processors/transformJson';
import { fileOutputHandler } from './destinations/fileOutput';
import { postgresDestinationHandler } from './destinations/postgres';
import { mysqlDestinationHandler } from './destinations/mysql';

const destinationHandler: NodeHandler = {
    async execute(ctx) {
        console.log(`Writing to destination (${ctx.config.label})...`, ctx.config);
        // Stub implementation for database destinations
        return { success: true, output: { saved: true, destination: ctx.config.label } };
    }
};

export const registry: Record<string, NodeHandler> = {
    'source': sourceHandler,
    'rest_api': restApiHandler,
    'transform_json': transformJsonHandler,
    'destination': destinationHandler,
    'file_destination': fileOutputHandler,
    'postgres_destination': postgresDestinationHandler,
    'mysql_destination': mysqlDestinationHandler,
};
