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
// @ts-ignore
const JSONStream = require('JSONStream');

interface NodeExecutionResult {
    nodeId: string;
    success: boolean;
    output?: any;
    error?: string;
}

export async function initializePipelineExecution(pipelineId: string): Promise<{ success: boolean, error?: string, data?: any }> {
    console.log(`Initializing pipeline execution: ${pipelineId}`);
    const { rows } = await db.query(
        `SELECT p.* FROM pipelines p WHERE p.id = $1`,
        [pipelineId]
    );

    if (rows.length === 0) {
        console.log('Pipeline not found.');
        return { success: false, error: 'Pipeline not found' };
    }

    const pipeline = rows[0];
    const { nodes, edges } = pipeline.flow_config || {};

    if (!nodes || nodes.length === 0) {
        console.log('Pipeline has no nodes.');
        return { success: false, error: 'Pipeline has no nodes' };
    }

    const execRes = await db.query(
        `INSERT INTO pipeline_executions (pipeline_id, status, logs) VALUES ($1, 'RUNNING', '[]') RETURNING id`,
        [pipeline.id]
    );

    return {
        success: true,
        data: {
            executionId: execRes.rows[0].id,
            pipeline,
            nodes,
            edges,
            connectionId: null,
            connectionName: pipeline.name
        }
    };
}

export async function executePipeline(initData: any, inputFilePath: string | null | undefined, options?: { debug?: boolean }) {
    const { executionId, nodes, edges, connectionId, connectionName } = initData;
    const logs: any[] = [];
    const debugData: Record<string, { inputs: any[], outputs: any[], label?: string }> = {};
    const executionResults = new Map<string, any>();

    const logPipelineEvent = async (message: string, level: 'INFO' | 'ERROR' = 'INFO', details?: any) => {
        logs.push({ timestamp: new Date(), message, level, details });
        await db.query(`UPDATE pipeline_executions SET logs = $1 WHERE id = $2`, [JSON.stringify(logs), executionId]);
    };

    // Helper functions
    const truncate = (obj: any): any => {
        const str = JSON.stringify(obj, null, 2);
        if (str && str.length > 500) {
            return str.substring(0, 500) + '... (truncated)';
        }
        try { return JSON.parse(str); } catch { return str; }
    };

    const captureFileDebug = async (filePath: string, nodeId: string, type: 'inputs' | 'outputs') => {
        if (!options?.debug) return;
        if (!debugData[nodeId]) {
            const node = nodes.find((n: any) => n.id === nodeId);
            debugData[nodeId] = { inputs: [], outputs: [], label: node?.data?.label || nodeId };
        }

        try {
            if (fs.existsSync(filePath)) {
                const content = fs.readFileSync(filePath, 'utf-8');
                const snippet = content.slice(0, 2000);
                try {
                    const json = JSON.parse(snippet);
                    if (Array.isArray(json)) {
                        debugData[nodeId][type].push(...json.slice(0, 5).map(truncate));
                    } else {
                        debugData[nodeId][type].push(truncate(json));
                    }
                } catch (e) {
                    debugData[nodeId][type].push(snippet.substring(0, 500));
                }
            }
        } catch (e) {
            console.warn(`Failed to capture debug data from ${filePath}`, e);
        }
    };

    try {
        await logPipelineEvent('Pipeline execution started');

        const execDir = createExecutionDirectory(executionId);
        console.log(`Execution Directory: ${execDir}`);

        const nodeMap = new Map<string, any>(nodes.map((n: any) => [n.id, n]));
        const outgoingEdges = new Map<string, string[]>();

        edges.forEach((e: any) => {
            if (!outgoingEdges.has(e.source)) outgoingEdges.set(e.source, []);
            outgoingEdges.get(e.source)?.push(e.target);
        });

        const sourceNode = nodes.find((n: any) => n.type === 'source');
        if (!sourceNode) throw new Error('No source node found in pipeline');

        const queue = [sourceNode.id];
        const visited = new Set<string>();

        executionResults.set(sourceNode.id, { filePath: inputFilePath });

        while (queue.length > 0) {
            const nodeId = queue.shift()!;
            if (visited.has(nodeId)) continue;
            visited.add(nodeId);

            const node = nodeMap.get(nodeId);
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

            if (node.type === 'source') {
                const sourceSeed = executionResults.get(nodeId);
                if (sourceSeed) inputFiles.push(sourceSeed);
            }

            if (options?.debug && node.type !== 'source') {
                for (const input of inputFiles) {
                    if (input.filePath) await captureFileDebug(input.filePath, nodeId, 'inputs');
                }
            }

            await logPipelineEvent(`Executing node: ${node.data.label} (${node.type})`, 'INFO', {
                inputSources: parentNodeNames ? parentNodeNames : 'Run Trigger (Source)'
            });

            try {
                const handler = registry[node.type];
                if (!handler) throw new Error(`No handler for node type: ${node.type}`);

                const result = await handler.execute({
                    nodeId,
                    config: node.data,
                    inputs: inputFiles
                });

                if (!result.success) throw new Error(result.error || 'Node execution failed');

                let outputResult = result.output;

                if (outputResult && (outputResult instanceof Readable || typeof outputResult.pipe === 'function')) {
                    const ext = 'json';
                    const jsonStream = JSONStream.stringify();

                    // Propagate errors from the source stream to the transformer
                    outputResult.on('error', (err: any) => {
                        console.error(`Stream error in node ${nodeId}:`, err);
                        // Explicitly emit error to ensure listeners (like saveFile) catch it
                        jsonStream.emit('error', err);
                    });

                    const serializedStream = outputResult.pipe(jsonStream);
                    // Use label for filename if available, otherwise nodeId
                    const filenameBase = node.data?.label || `${node.type}_${node.id}`;
                    const persistedPath = await saveFile(filenameBase, serializedStream, ext, execDir);
                    outputResult = { filePath: persistedPath };
                    console.log(`Node ${nodeId} output persisted to ${persistedPath}`);
                }
                else if (outputResult && (
                    Array.isArray(outputResult) ||
                    (typeof outputResult === 'object' && !outputResult.filePath && !outputResult.destination) ||
                    typeof outputResult === 'string'
                )) {
                    let content = outputResult;
                    let ext = 'json';
                    if (typeof outputResult !== 'string') {
                        content = JSON.stringify(outputResult, null, 2);
                    } else {
                        const trimmed = outputResult.trim();
                        if (trimmed.startsWith('<')) {
                            ext = 'xml';
                        } else {
                            try {
                                JSON.parse(trimmed);
                            } catch {
                                ext = 'txt';
                            }
                        }
                    }
                    const filenameBase = node.data?.label || `${node.type}_${node.id}`;
                    const persistedPath = await saveFile(filenameBase, content, ext, execDir);
                    outputResult = { filePath: persistedPath };
                    console.log(`Node ${nodeId} output saved to ${persistedPath}`);
                }

                executionResults.set(nodeId, outputResult);

                if (options?.debug) {
                    if (outputResult.filePath) {
                        await captureFileDebug(outputResult.filePath, nodeId, 'outputs');
                    } else {
                        if (!debugData[nodeId]) {
                            const node = nodes.find((n: any) => n.id === nodeId);
                            debugData[nodeId] = { inputs: [], outputs: [], label: node?.data?.label || nodeId };
                        }
                        debugData[nodeId].outputs.push(truncate(outputResult));
                    }
                }

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

        const validOutputs = Object.fromEntries(executionResults);
        await db.query(`UPDATE pipeline_executions SET status = 'COMPLETED', completed_at = NOW(), outputs = $2 WHERE id = $1`, [executionId, JSON.stringify(validOutputs)]);
        await logPipelineEvent('Pipeline execution completed successfully');
        await logEvent(connectionId, connectionName, 'PIPELINE', 'SUCCESS', 'Pipeline executed successfully', { executionId });

        return { success: true, executionId, debugData };

    } catch (error: any) {
        console.error('Pipeline failed:', error);

        const partialOutputs = Object.fromEntries(executionResults);
        await db.query(`UPDATE pipeline_executions SET status = 'FAILED', completed_at = NOW(), outputs = $2 WHERE id = $1`, [executionId, JSON.stringify(partialOutputs)]);

        await logPipelineEvent(`Pipeline failed: ${error.message}`, 'ERROR');
        await logEvent(connectionId, connectionName, 'PIPELINE', 'FAILURE', 'Pipeline execution failed', { error: error.message });
        return { success: false, error: error.message };
    }
}

export async function runPipeline(pipelineId: string, inputFilePath: string | null | undefined, options?: { debug?: boolean }) {
    const init = await initializePipelineExecution(pipelineId);
    if (!init.success || !init.data) return { success: false, error: init.error };
    return await executePipeline(init.data, inputFilePath, options);
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
