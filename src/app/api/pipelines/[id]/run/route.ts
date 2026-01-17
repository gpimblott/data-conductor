import { NextResponse } from 'next/server';
import { initializePipelineExecution, executePipeline } from '@/lib/pipeline/orchestrator';

// Allow longer execution if environment supports it, though we are returning early now.
export const maxDuration = 300;

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        let body = {};
        try {
            body = await req.json();
        } catch {
            // Empty body is fine, use default options
        }

        const debug = (body as any).debug === true;

        // Initialize execution synchronously (creates DB record)
        const init = await initializePipelineExecution(id);

        if (!init.success || !init.data) {
            return NextResponse.json({ error: init.error || 'Failed to initialize pipeline' }, { status: 404 });
        }

        // Start execution asynchronously
        // We do NOT await this, allowing the API request to complete immediately.
        // This prevents timeouts on the frontend for long-running pipelines.
        executePipeline(init.data, null, { debug })
            .catch(err => console.error(`Async pipeline execution failed for ${init.data.executionId}:`, err));

        // Return immediately with accepted status
        return NextResponse.json({
            success: true,
            message: 'Pipeline execution started',
            executionId: init.data.executionId
        });

    } catch (error: any) {
        console.error('Run pipeline error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
