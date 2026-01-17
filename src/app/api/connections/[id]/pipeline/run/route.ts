import { NextResponse } from 'next/server';
import { runPipeline } from '@/lib/pipeline/orchestrator';
import { findLatestDownload } from '@/lib/pipeline';
import { db } from '@/lib/db';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const id = (await params).id;
        const body = await request.json();
        const debug = body.debug === true;

        if (!id) {
            return NextResponse.json({ error: 'Connection ID is required' }, { status: 400 });
        }

        console.log(`Triggering pipeline for connection ${id} (Debug: ${debug})`);

        // 1. Get Connection Name (for finding file)
        const { rows } = await db.query('SELECT name FROM connections WHERE id = $1', [id]);
        if (rows.length === 0) {
            return NextResponse.json({ error: 'Connection not found' }, { status: 404 });
        }
        const connectionName = rows[0].name;

        // 2. Find Input File
        const inputFilePath = await findLatestDownload(connectionName);
        if (!inputFilePath) {
            return NextResponse.json({ error: 'No source data found. Please run Sync first.' }, { status: 400 });
        }

        // 3. Run Pipeline
        const result = await runPipeline(id, inputFilePath, { debug });

        if (result && result.success) {
            return NextResponse.json({
                success: true,
                message: 'Pipeline executed successfully',
                debugData: result.debugData,
                executionId: result.executionId
            });
        } else {
            return NextResponse.json({
                success: false,
                error: result?.error || 'Unknown error'
            }, { status: 500 });
        }

    } catch (error: any) {
        console.error('Run pipeline API error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
