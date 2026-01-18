
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import fs from 'fs';
import path from 'path';

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
            console.warn(`File output not found for exec=${executionId}, node=${nodeId}. Outputs keys: ${Object.keys(outputs).join(',')}`);
            return NextResponse.json({ error: 'File output not found' }, { status: 404 });
        }

        const url = new URL(request.url);
        const limitStr = url.searchParams.get('limit');
        const downloadStr = url.searchParams.get('download');
        const limit = limitStr ? parseInt(limitStr) : null;
        const isDownload = downloadStr === 'true';

        if (!fs.existsSync(filePath)) {
            // Try resolving to absolute path just in case
            const absPath = path.resolve(filePath);
            if (fs.existsSync(absPath)) {
                // If absolute path exists, let's use it
                // console.log(`Found file at absolute path: ${absPath}`);
            } else {
                console.error(`File not found on server. Checked path: ${filePath} and ${absPath}`);
                return NextResponse.json({ error: `File not found on server at ${filePath}` }, { status: 404 });
            }
        }

        let content;
        if (limit && !isDownload) {
            const buffer = Buffer.alloc(limit);
            const fd = fs.openSync(filePath, 'r');
            const bytesRead = fs.readSync(fd, buffer, 0, limit, 0);
            fs.closeSync(fd);
            content = buffer.toString('utf8', 0, bytesRead);
            // Append truncated message if file is larger
            const stats = fs.statSync(filePath);
            if (stats.size > limit) {
                content += '\n\n... (truncated view used for performance)';
            }
        } else {
            content = fs.readFileSync(filePath, 'utf-8');
        }

        const headers: Record<string, string> = { 'Content-Type': 'text/plain' };
        if (isDownload) {
            const filename = path.basename(filePath);
            headers['Content-Disposition'] = `attachment; filename="${filename}"`;
        }

        return new NextResponse(content, {
            headers
        });

    } catch (error) {
        console.error('Failed to get file content:', error);
        return NextResponse.json(
            { error: 'Failed to get file content' },
            { status: 500 }
        );
    }
}
