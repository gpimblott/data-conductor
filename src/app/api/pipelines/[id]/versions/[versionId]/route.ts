
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: Request, { params }: { params: Promise<{ id: string, versionId: string }> }) {
    try {
        const { id, versionId } = await params;

        const { rows } = await db.query(
            `SELECT * FROM pipeline_versions WHERE pipeline_id = $1 AND id = $2`,
            [id, versionId]
        );

        if (rows.length === 0) {
            return NextResponse.json({ error: 'Version not found' }, { status: 404 });
        }

        return NextResponse.json(rows[0]);
    } catch (error) {
        console.error('Failed to get version:', error);
        return NextResponse.json({ error: 'Failed to get version' }, { status: 500 });
    }
}
