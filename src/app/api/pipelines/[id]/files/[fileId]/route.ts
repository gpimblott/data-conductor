
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import fs from 'fs';

export const dynamic = 'force-dynamic';

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string; fileId: string }> }
) {
    try {
        const { id, fileId } = await params;

        // fileId is "executionId:nodeId"
        const [executionId, ...nodeIdParts] = fileId.split(':');
        const nodeId = nodeIdParts.join(':');

        if (!executionId || !nodeId) {
            return NextResponse.json({ error: 'Invalid file ID format' }, { status: 400 });
        }

        const { rows } = await db.query(
            `SELECT outputs
             FROM pipeline_executions
             WHERE id = $1 AND pipeline_id = $2`,
            [executionId, id]
        );

        if (rows.length === 0) {
            return NextResponse.json({ error: 'File execution record not found' }, { status: 404 });
        }

        const outputs = rows[0].outputs || {};
        const output = outputs[nodeId];

        const filePath = output?.filePath || output?.path;

        if (!output || !filePath) {
            return NextResponse.json({ error: 'File output not found' }, { status: 404 });
        }

        if (!fs.existsSync(filePath)) {
            return NextResponse.json({ error: 'File not found on server' }, { status: 404 });
        }

        const content = fs.readFileSync(filePath, 'utf-8');
        return new NextResponse(content, {
            headers: { 'Content-Type': 'text/plain' }
        });

    } catch (error) {
        console.error('Failed to get file content:', error);
        return NextResponse.json(
            { error: 'Failed to get file content' },
            { status: 500 }
        );
    }
}
