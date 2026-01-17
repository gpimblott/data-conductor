
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import fs from 'fs';

export const dynamic = 'force-dynamic';

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        const url = new URL(request.url);
        const page = parseInt(url.searchParams.get('page') || '1');
        const limit = parseInt(url.searchParams.get('limit') || '10');
        const offset = (page - 1) * limit;

        // Get total count of executions with outputs that are NOT purged
        const countRes = await db.query(
            `SELECT COUNT(*) as total FROM pipeline_executions 
             WHERE pipeline_id = $1 
               AND outputs IS NOT NULL 
               AND (purged IS NULL OR purged = FALSE)`,
            [id]
        );
        const total = parseInt(countRes.rows[0].total || '0');
        const totalPages = Math.ceil(total / limit);

        // Fetch executions with outputs (paginated)
        const { rows } = await db.query(
            `SELECT id, started_at, outputs
             FROM pipeline_executions
             WHERE pipeline_id = $1
               AND outputs IS NOT NULL
               AND (purged IS NULL OR purged = FALSE)
             ORDER BY started_at DESC
             LIMIT $2 OFFSET $3`,
            [id, limit, offset]
        );

        const files = [];

        for (const row of rows) {
            let outputs = row.outputs || {};
            if (typeof outputs === 'string') {
                try {
                    outputs = JSON.parse(outputs);
                } catch (e) {
                    outputs = {};
                }
            }

            for (const [nodeId, output] of Object.entries(outputs)) {
                if (output && typeof output === 'object' && (output as any).filePath) {
                    const filePath = (output as any).filePath;
                    if (fs.existsSync(filePath)) {
                        try {
                            const stats = fs.statSync(filePath);
                            files.push({
                                id: `${row.id}:${nodeId}`,
                                executionId: row.id,
                                nodeId: nodeId,
                                createdAt: row.started_at,
                                filePath: filePath,
                                fileSize: stats.size
                            });
                        } catch (e) { }
                    }
                }
            }
        }

        return NextResponse.json({
            items: files,
            total,
            page,
            limit,
            totalPages
        });
    } catch (error) {
        console.error('Failed to list pipeline files:', error);
        return NextResponse.json(
            { error: 'Failed to list files' },
            { status: 500 }
        );
    }
}
