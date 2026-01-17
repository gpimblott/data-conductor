
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { createExecutionDirectory, deleteDirectory } from '@/lib/storage';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;

        // Fetch all executions for this pipeline, ordered by date desc
        const { rows } = await db.query(
            `SELECT id, purged FROM pipeline_executions WHERE pipeline_id = $1 ORDER BY started_at DESC`,
            [id]
        );

        if (rows.length <= 5) {
            return NextResponse.json({ message: 'No executions to purge (keep last 5)', count: 0 });
        }

        // Get executions to purge (everything after the 5th one)
        // Filter out those already purged
        const executionsToPurge = rows.slice(5).filter((exec: any) => !exec.purged);
        let purgedCount = 0;

        for (const exec of executionsToPurge) {
            try {
                // Get the directory path for this execution
                const dirPath = createExecutionDirectory(exec.id);

                // Delete the directory and its contents
                await deleteDirectory(dirPath);

                // Mark as purged
                await db.query('UPDATE pipeline_executions SET purged = TRUE WHERE id = $1', [exec.id]);
                purgedCount++;
            } catch (err) {
                console.error(`Failed to purge execution ${exec.id}:`, err);
                // Continue with others even if one fails
            }
        }

        return NextResponse.json({
            message: `Purged files for ${purgedCount} executions`,
            count: purgedCount
        });

    } catch (error) {
        console.error('Purge failed:', error);
        return NextResponse.json({ error: 'Failed to purge executions' }, { status: 500 });
    }
}
