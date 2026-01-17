/*
 * DataConductor
 * Copyright (C) 2026
 */

import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { deleteDirectory, createExecutionDirectory, listConnectorFiles, deleteFile } from '@/lib/storage';
import { logEvent } from '@/lib/logger';
import path from 'path';
import fs from 'fs';

export async function POST(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const connectionId = id;

    try {
        console.log(`Purging history for connection: ${connectionId}`);

        // 1. Get Connection Details (for name)
        const connRes = await db.query('SELECT name FROM connections WHERE id = $1', [connectionId]);
        if (connRes.rows.length === 0) {
            return NextResponse.json({ error: 'Connection not found' }, { status: 404 });
        }
        const connectionName = connRes.rows[0].name;

        // 2. Connector Files Purge (Keep last 3)
        let deletedFilesCount = 0;
        try {
            // Get files from directory
            const diskFiles = await listConnectorFiles(connectionName);

            // Get files from logs (handling potential renames or scattered files)
            const logRes = await db.query(
                `SELECT DISTINCT details->>'filePath' as file_path 
                 FROM connection_logs 
                 WHERE connection_id = $1 
                   AND event_type = 'SYNC' 
                   AND details->>'filePath' IS NOT NULL`,
                [connectionId]
            );

            const logFiles = logRes.rows.map(r => r.file_path);

            // Merge and Deduplicate
            const uniquePaths = Array.from(new Set([...diskFiles, ...logFiles]));

            // Filter only existing files and get stats
            const validFiles = uniquePaths
                .filter(p => p && !p.startsWith('s3://') && fs.existsSync(p)) // Local only for now
                .map(p => ({
                    path: p,
                    mtime: fs.statSync(p).mtime.getTime()
                }));

            // Sort by modification time desc (newest first)
            validFiles.sort((a, b) => b.mtime - a.mtime);

            const filesToDelete = validFiles.slice(3); // Keep top 3

            for (const file of filesToDelete) {
                await deleteFile(file.path);
                deletedFilesCount++;
            }
        } catch (err) {
            console.warn('Failed to purge connector files', err);
        }

        // 3. Pipeline Executions Purge (Keep last 3)
        const execRes = await db.query(`
            SELECT pe.id, pe.started_at 
            FROM pipeline_executions pe
            JOIN pipelines p ON pe.pipeline_id = p.id
            WHERE p.connection_id = $1
            ORDER BY pe.started_at DESC
        `, [connectionId]);

        const allExecutions = execRes.rows;
        const executionsKeeping = allExecutions.slice(0, 3);
        const executionsDeleting = allExecutions.slice(3);

        let deletedExecutionsCount = 0;

        for (const exec of executionsDeleting) {
            // Delete Directory
            const dirPath = createExecutionDirectory(exec.id); // Get path
            await deleteDirectory(dirPath);

            // Delete DB Record
            await db.query('DELETE FROM pipeline_executions WHERE id = $1', [exec.id]);
            deletedExecutionsCount++;
        }

        await logEvent(connectionId, connectionName, 'UPDATE', 'INFO', 'Purged history', {
            deletedFiles: deletedFilesCount,
            deletedExecutions: deletedExecutionsCount
        });

        return NextResponse.json({
            success: true,
            deletedFiles: deletedFilesCount,
            deletedExecutions: deletedExecutionsCount
        });

    } catch (error: any) {
        console.error('Purge failed:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
