
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: Request, { params }: { params: Promise<{ id: string, executionId: string }> }) {
    try {
        const { id, executionId } = await params;

        // Fetch execution details
        const { rows: execRows } = await db.query(
            `SELECT * FROM pipeline_executions WHERE id = $1 AND pipeline_id = $2`,
            [executionId, id]
        );

        if (execRows.length === 0) {
            return NextResponse.json({ error: 'Execution not found' }, { status: 404 });
        }

        const execution = execRows[0];

        // Logs are already in the 'logs' column of pipeline_executions
        if (execution.logs && typeof execution.logs === 'string') {
            try { execution.logs = JSON.parse(execution.logs); } catch (e) { }
        }

        return NextResponse.json(execution);
    } catch (error) {
        console.error('Failed to get execution details:', error);
        return NextResponse.json({ error: 'Failed to get execution details' }, { status: 500 });
    }
}
