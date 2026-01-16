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
        console.log('Executing Source Node...', JSON.stringify(ctx.inputs, null, 2));

        // Orchestrator seeds the source node with { filePath: string }
        const input = ctx.inputs[0];

        if (input && input.filePath) {
            try {
                const fs = await import('fs/promises');
                const content = await fs.readFile(input.filePath, 'utf-8');
                // Try parsing as JSON, otherwise return text
                try {
                    const json = JSON.parse(content);
                    return { success: true, output: json };
                } catch {
                    return { success: true, output: content };
                }
            } catch (err: any) {
                return { success: false, error: `Failed to read source file: ${err.message}` };
            }
        }

        // Fallback if no file path (e.g. testing)
        return { success: true, output: input || {} };
    }
};

import { restApiHandler } from './processors/restApi';
import { transformJsonHandler } from './processors/transformJson';
import { fileOutputHandler } from './destinations/fileOutput';
import { postgresDestinationHandler } from './destinations/postgres';

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
};
