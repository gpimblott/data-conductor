/*
 * DataConductor
 * Copyright (C) 2026
 */

import fs from 'fs';
// @ts-ignore
const JSONStream = require('JSONStream');
import { syncRegistry } from './sync';

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
        console.log('Executing Source Node...');

        // 1. Check for Input File (Legacy / Manual Trigger)
        const input = ctx.inputs[0];
        if (input && input.filePath) {
            console.log('Using Input File:', input.filePath);
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
                // console.log(`Source Node: Detected ${isObject ? 'Object' : 'Array'} input, using selector '${selector}'`);

                const stream = fs.createReadStream(input.filePath, { encoding: 'utf8' })
                    .pipe(JSONStream.parse(selector));

                return { success: true, output: stream };

            } catch (err: any) {
                return { success: false, error: `Failed to read source file: ${err.message}` };
            }
        }

        // 2. Active Fetching (Embedded Config)
        else if (ctx.config.connectionType) {
            console.log(`Source Node: Active Fetching using ${ctx.config.connectionType}`);
            const handler = syncRegistry[ctx.config.connectionType];
            if (!handler) return { success: false, error: `Unsupported connection type: ${ctx.config.connectionType}` };

            try {
                // Construct pseudo-connection object with snake_case mapping for legacy handlers
                const rawConfig = ctx.config.connectionConfig || {};
                const connectionObj = {
                    id: ctx.nodeId,
                    type: ctx.config.connectionType as any,
                    name: ctx.config.name || 'Source',
                    status: 'ACTIVE',
                    // Map camelCase config to snake_case expected by handlers
                    source_url: rawConfig.url,
                    connection_string: rawConfig.connectionString,
                    sql_query: rawConfig.query,
                    username: rawConfig.username,
                    password: rawConfig.password,
                    // Preserve options
                    options: { convertXml: rawConfig.convertXml },
                    ...rawConfig
                };

                const result = await handler.execute(connectionObj as any); // Cast to Connection

                return { success: true, output: result.data };
            } catch (err: any) {
                return { success: false, error: `Fetch failed: ${err.message}` };
            }
        }

        // Fallback or Error
        return { success: false, error: 'No source input provided and no connection config found.' };
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
