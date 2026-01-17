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


import { db } from '@/lib/db';
import { logEvent } from '@/lib/logger';
import { registry } from './nodes/registry';
import { createExecutionDirectory, saveFile } from '@/lib/storage';
import path from 'path';
import fs from 'fs';
import { Readable } from 'stream';
import JSONStream from 'JSONStream';

interface NodeExecutionResult {
    nodeId: string;
    success: boolean;
    output?: any;
    error?: string;
}

export async function runPipeline(connectionId: string, inputFilePath: string, options?: { debug?: boolean }) {
    console.log(`Checking for active pipelines for connection: ${connectionId}`);

    const { rows } = await db.query(
        `SELECT * FROM pipelines WHERE connection_id = $1 ORDER BY created_at DESC LIMIT 1`,
        [connectionId]
    );

    if (rows.length === 0) {
        console.log('No pipeline found.');
        return { success: false, error: 'No pipeline found' };
    }

    const pipeline = rows[0];
    const { nodes, edges } = pipeline.flow_config;

    if (!nodes || nodes.length === 0) {
        console.log('Pipeline has no nodes.');
        return { success: false, error: 'Pipeline has no nodes' };
    }

    // Create Execution Record
    const execRes = await db.query(
        `INSERT INTO pipeline_executions (pipeline_id, status, logs) VALUES ($1, 'RUNNING', '[]') RETURNING id`,
        [pipeline.id]
    );
    const executionId = execRes.rows[0].id;
    const logs: any[] = [];
    const debugData: Record<string, { inputs: any[], outputs: any[] }> = {}; // NodeId -> { inputs: [], outputs: [] }

    const logPipelineEvent = async (message: string, level: 'INFO' | 'ERROR' = 'INFO', details?: any) => {
        logs.push({ timestamp: new Date(), message, level, details });
        await db.query(`UPDATE pipeline_executions SET logs = $1 WHERE id = $2`, [JSON.stringify(logs), executionId]);
    };

    try {
        await logPipelineEvent('Pipeline execution started');

        // Setup Execution Directory
        const execDir = createExecutionDirectory(executionId);
        console.log(`Execution Directory: ${execDir}`);

        // Build Graph
        const nodeMap = new Map<string, any>(nodes.map((n: any) => [n.id, n]));
        const outgoingEdges = new Map<string, string[]>();

        edges.forEach((e: any) => {
            if (!outgoingEdges.has(e.source)) outgoingEdges.set(e.source, []);
            outgoingEdges.get(e.source)?.push(e.target);
        });

        // Find Source Node
        const sourceNode = nodes.find((n: any) => n.type === 'source');
        if (!sourceNode) throw new Error('No source node found in pipeline');

        // Topological Sort / Traversal (Simple BFS)
        const queue = [sourceNode.id];
        const visited = new Set<string>();
        // Map Node ID corresponding output FILE PATH (or object for metadata)
        const executionResults = new Map<string, any>();

        // Initialize Source Output: The input trigger file IS the source output effectively.
        // We map the source node ID to the input file path so children read from it.
        executionResults.set(sourceNode.id, { filePath: inputFilePath });

        // Helper to truncate for debug
        const truncate = (obj: any): any => {
            const str = JSON.stringify(obj, null, 2);
            if (str && str.length > 500) {
                return str.substring(0, 500) + '... (truncated)';
            }
            try { return JSON.parse(str); } catch { return str; }
        };

        // Helper to capture file head for debug inputs/outputs
        const captureFileDebug = async (filePath: string, nodeId: string, type: 'inputs' | 'outputs') => {
            if (!options?.debug) return;
            if (!debugData[nodeId]) debugData[nodeId] = { inputs: [], outputs: [] };

            try {
                // Read first 5 lines/objects
                if (fs.existsSync(filePath)) {
                    // Quick and dirty: read small chunk
                    const content = fs.readFileSync(filePath, 'utf-8'); // CAREFUL with huge files, better to stream head
                    // Just take a snippet
                    const snippet = content.slice(0, 2000);
                    // Try to parse json lines or array?
                    // If JSON array
                    try {
                        const json = JSON.parse(snippet); // Might fail if truncated
                        // If valid json array/obj, push it
                        if (Array.isArray(json)) {
                            debugData[nodeId][type].push(...json.slice(0, 5).map(truncate));
                        } else {
                            debugData[nodeId][type].push(truncate(json));
                        }
                    } catch (e) {
                        // Maybe it's NDJSON? or just plain text
                        debugData[nodeId][type].push(snippet.substring(0, 500));
                    }
                }
            } catch (e) {
                console.warn(`Failed to capture debug data from ${filePath}`, e);
            }
        };


        while (queue.length > 0) {
            const nodeId = queue.shift()!;
            if (visited.has(nodeId)) continue;
            visited.add(nodeId);

            const node = nodeMap.get(nodeId);

            // Collect Input File Paths
            const inputFiles: any[] = [];

            const parentEdges = edges.filter((e: any) => e.target === nodeId);
            const parentNodeNames = parentEdges.map((e: any) => {
                const pNode = nodeMap.get(e.source);
                const pResult = executionResults.get(e.source);
                if (pResult) {
                    inputFiles.push(pResult);
                }
                return pNode?.data?.label || e.source;
            }).join(', ');

            // Source node special case
            if (node.type === 'source') {
                // The source node expects the input file path to be passed as an input.
                // We pre-seeded this in executionResults at the start.
                const sourceSeed = executionResults.get(nodeId);
                if (sourceSeed) {
                    inputFiles.push(sourceSeed);
                }
            }

            // Capture Debug INPUTS (File-based now)
            if (options?.debug && node.type !== 'source') {
                for (const input of inputFiles) {
                    if (input.filePath) {
                        await captureFileDebug(input.filePath, nodeId, 'inputs');
                    }
                }
            }

            await logPipelineEvent(`Executing node: ${node.data.label} (${node.type})`, 'INFO', {
                inputSources: parentNodeNames ? parentNodeNames : 'Run Trigger (Source)'
            });

            try {
                const handler = registry[node.type];
                if (!handler) throw new Error(`No handler for node type: ${node.type}`);

                // Execute Node
                // Inputs are now objects like { filePath: '/path/to/file.json' }
                const result = await handler.execute({
                    nodeId,
                    config: node.data,
                    inputs: inputFiles
                });

                if (!result.success) throw new Error(result.error || 'Node execution failed');

                // Output Persistence Logic
                let outputResult = result.output;

                // If output contains a Stream, persist it to file
                // We check if output is stream-like
                if (outputResult && (outputResult instanceof Readable || typeof outputResult.pipe === 'function')) {
                    const ext = 'json';
                    // Serialize Object Stream to JSON Array Stream for storage
                    const serializedStream = outputResult.pipe(JSONStream.stringify());

                    // Save to execution directory
                    const persistedPath = await saveFile(nodeId, serializedStream, ext, execDir);

                    outputResult = { filePath: persistedPath };
                    console.log(`Node ${nodeId} output persisted to ${persistedPath}`);
                }
                // If output is raw data (Array/Object), save it too if substantial?
                else if (outputResult && (Array.isArray(outputResult) || (typeof outputResult === 'object' && !outputResult.filePath && !outputResult.destination))) {
                    // It's a data object, save it to file so next node can read it
                    const persistedPath = await saveFile(nodeId, JSON.stringify(outputResult, null, 2), 'json', execDir);
                    outputResult = { filePath: persistedPath };
                    console.log(`Node ${nodeId} output saved to ${persistedPath}`);
                }

                // If outputResult has .destination (e.g. database result metadata), we keep it as is.

                executionResults.set(nodeId, outputResult);

                // Capture Debug OUTPUTS
                if (options?.debug) {
                    if (outputResult.filePath) {
                        await captureFileDebug(outputResult.filePath, nodeId, 'outputs');
                    } else {
                        // Metadata
                        if (!debugData[nodeId]) debugData[nodeId] = { inputs: [], outputs: [] };
                        debugData[nodeId].outputs.push(truncate(outputResult));
                    }
                }

                // Add children
                const children = outgoingEdges.get(nodeId) || [];
                queue.push(...children);

            } catch (err: any) {
                await logPipelineEvent(`Node execution failed: ${err.message}`, 'ERROR', { stack: err.stack });
                throw err;
            }
        }

        if (options?.debug) {
            await logPipelineEvent('Debug Data Captured', 'INFO', debugData);
        }

        await db.query(`UPDATE pipeline_executions SET status = 'COMPLETED', completed_at = NOW() WHERE id = $1`, [executionId]);
        await logPipelineEvent('Pipeline execution completed successfully');
        await logEvent(connectionId, pipeline.name, 'PIPELINE', 'SUCCESS', 'Pipeline executed successfully', { executionId });

        return { success: true, executionId, debugData };

    } catch (error: any) {
        console.error('Pipeline failed:', error);
        await db.query(`UPDATE pipeline_executions SET status = 'FAILED', completed_at = NOW() WHERE id = $1`, [executionId]);
        await logPipelineEvent(`Pipeline failed: ${error.message}`, 'ERROR');
        await logEvent(connectionId, pipeline.name, 'PIPELINE', 'FAILURE', 'Pipeline execution failed', { error: error.message });
        return { success: false, error: error.message };
    }
}

function findInputData(nodeId: string, edges: any[], results: Map<string, any>) {
    // Collect outputs from all nodes that point to this node
    const inputs: any[] = [];
    const parentEdges = edges.filter((e: any) => e.target === nodeId);

    for (const edge of parentEdges) {
        const parentResult = results.get(edge.source);
        if (parentResult) {
            inputs.push(parentResult);
        }
    }
    // For source node, we manually pre-set the result, so this function returns empty array which is fine.
    // Ideally for Source node we want to pass the initial input, but we handle that by pre-populating results map.
    return inputs;
}
