
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;

        const { rows } = await db.query(
            `SELECT id, version, description, created_at FROM pipeline_versions WHERE pipeline_id = $1 ORDER BY version DESC`,
            [id]
        );

        return NextResponse.json(rows);
    } catch (error) {
        console.error('Failed to list versions:', error);
        return NextResponse.json({ error: 'Failed to list versions' }, { status: 500 });
    }
}
