
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const url = new URL(req.url);
        const page = parseInt(url.searchParams.get('page') || '1');
        const limit = parseInt(url.searchParams.get('limit') || '10');
        const offset = (page - 1) * limit;

        // Get total count
        const countRes = await db.query(
            `SELECT COUNT(*) as total FROM pipeline_executions WHERE pipeline_id = $1`,
            [id]
        );
        const total = parseInt(countRes.rows[0].total);

        // Get paginated rows
        const { rows } = await db.query(
            `SELECT * FROM pipeline_executions WHERE pipeline_id = $1 ORDER BY started_at DESC LIMIT $2 OFFSET $3`,
            [id, limit, offset]
        );

        return NextResponse.json({
            items: rows,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit)
        });
    } catch (error) {
        console.error('Failed to list executions:', error);
        return NextResponse.json({ error: 'Failed to list executions' }, { status: 500 });
    }
}
