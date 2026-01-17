
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const { versionId } = await req.json();

        // 1. Get Logged Version
        const { rows } = await db.query(
            `SELECT flow_config FROM pipeline_versions WHERE pipeline_id = $1 AND id = $2`,
            [id, versionId]
        );

        if (rows.length === 0) {
            return NextResponse.json({ error: 'Version not found' }, { status: 404 });
        }

        const restoredConfig = rows[0].flow_config;

        // 2. Begin Transaction
        await db.query('BEGIN');

        try {
            // 3. Update Current Pipeline
            await db.query(
                `UPDATE pipelines SET flow_config = $1, updated_at = NOW() WHERE id = $2`,
                [restoredConfig, id]
            );

            // 4. Create New History Entry (Restored)
            const { rows: verRows } = await db.query(
                `SELECT COALESCE(MAX(version), 0) + 1 as next_version FROM pipeline_versions WHERE pipeline_id = $1`,
                [id]
            );
            const nextVersion = verRows[0].next_version;

            await db.query(
                `INSERT INTO pipeline_versions (pipeline_id, flow_config, version, description)
                 VALUES ($1, $2, $3, $4)`,
                [id, restoredConfig, nextVersion, `Restored from version ID: ${versionId}`]
            );

            await db.query('COMMIT');
            return NextResponse.json({ success: true });
        } catch (err) {
            await db.query('ROLLBACK');
            throw err;
        }

    } catch (error) {
        console.error('Restore error:', error);
        return NextResponse.json({ error: 'Failed to restore' }, { status: 500 });
    }
}
