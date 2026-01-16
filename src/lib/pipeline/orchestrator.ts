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

interface NodeExecutionResult {
    nodeId: string;
    success: boolean;
    output?: any;
    error?: string;
}

export async function runPipeline(connectionId: string, inputFilePath: string) {
    console.log(`Checking for active pipelines for connection: ${connectionId}`);

    // Fetch active pipeline
    const { rows } = await db.query(
        `SELECT * FROM pipelines WHERE connection_id = $1 AND is_active = true ORDER BY created_at DESC LIMIT 1`,
        [connectionId]
    );

    if (rows.length === 0) {
        console.log('No active pipeline found.');
        return;
    }

    const pipeline = rows[0];
    const { nodes, edges } = pipeline.flow_config;

    if (!nodes || nodes.length === 0) {
        console.log('Pipeline has no nodes.');
        return;
    }

    // Create Execution Record
    const execRes = await db.query(
        `INSERT INTO pipeline_executions (pipeline_id, status, logs) VALUES ($1, 'RUNNING', '[]') RETURNING id`,
        [pipeline.id]
    );
    const executionId = execRes.rows[0].id;
    const logs: any[] = [];

    const logPipelineEvent = async (message: string, level: 'INFO' | 'ERROR' = 'INFO', details?: any) => {
        logs.push({ timestamp: new Date(), message, level, details });
        await db.query(`UPDATE pipeline_executions SET logs = $1 WHERE id = $2`, [JSON.stringify(logs), executionId]);
    };

    try {
        await logPipelineEvent('Pipeline execution started');

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

        // Topological Sort / Traversal (Simple BFS for now)
        const queue = [sourceNode.id];
        const visited = new Set<string>();
        const executionResults = new Map<string, any>(); // Node ID -> Output Data

        // Initialize Source Output with the input file
        executionResults.set(sourceNode.id, { filePath: inputFilePath });

        while (queue.length > 0) {
            const nodeId = queue.shift()!;
            if (visited.has(nodeId)) continue;
            visited.add(nodeId);

            const node = nodeMap.get(nodeId);
            let inputData = findInputData(nodeId, edges, executionResults); // Collect inputs from parents

            // Special case for Source Node: Inject the initial trigger input (file path)
            if (node.type === 'source') {
                inputData = [{ filePath: inputFilePath }];
            }

            await logPipelineEvent(`Executing node: ${node.data.label} (${node.type})`);

            try {
                const handler = registry[node.type];
                if (!handler) {
                    throw new Error(`No handler for node type: ${node.type}`);
                }

                const result = await handler.execute({
                    nodeId,
                    config: node.data,
                    inputs: inputData
                });

                if (!result.success) {
                    throw new Error(result.error || 'Node execution failed');
                }

                executionResults.set(nodeId, result.output);

                // Add children to queue
                const children = outgoingEdges.get(nodeId) || [];
                queue.push(...children);

            } catch (err: any) {
                await logPipelineEvent(`Node execution failed: ${err.message}`, 'ERROR');
                throw err;
            }
        }

        await db.query(`UPDATE pipeline_executions SET status = 'COMPLETED', completed_at = NOW() WHERE id = $1`, [executionId]);
        await logPipelineEvent('Pipeline execution completed successfully');
        await logEvent(connectionId, pipeline.name, 'PIPELINE', 'SUCCESS', 'Pipeline executed successfully', { executionId });

    } catch (error: any) {
        console.error('Pipeline failed:', error);
        await db.query(`UPDATE pipeline_executions SET status = 'FAILED', completed_at = NOW() WHERE id = $1`, [executionId]);
        await logPipelineEvent(`Pipeline failed: ${error.message}`, 'ERROR');
        await logEvent(connectionId, pipeline.name, 'PIPELINE', 'FAILURE', 'Pipeline execution failed', { error: error.message });
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
