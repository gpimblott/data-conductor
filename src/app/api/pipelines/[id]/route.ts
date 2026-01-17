
import { NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
    connectionString: process.env.POSTGRES_URL || process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

export const dynamic = 'force-dynamic';

// GET /api/pipelines/[id]
export async function GET(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const client = await pool.connect();
        try {
            const res = await client.query(`SELECT * FROM pipelines WHERE id = $1`, [id]);
            if (res.rows.length === 0) {
                return NextResponse.json({ error: 'Pipeline not found' }, { status: 404 });
            }
            return NextResponse.json(res.rows[0]);
        } finally {
            client.release();
        }
    } catch (error) {
        console.error('Failed to get pipeline:', error);
        return NextResponse.json({ error: 'Failed to get pipeline' }, { status: 500 });
    }
}

// PUT /api/pipelines/[id] - Update Pipeline (Save)
export async function PUT(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const body = await req.json();
        const { flowConfig, name, description, schedule, status } = body; // status or isActive

        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            // 1. Update Pipeline
            const res = await client.query(`
                UPDATE pipelines 
                SET flow_config = COALESCE($1, flow_config),
                    updated_at = NOW(),
                    name = COALESCE($2, name),
                    description = COALESCE($3, description),
                    status = COALESCE($4, status),
                    schedule = COALESCE($5, schedule)
                WHERE id = $6
                RETURNING id
            `, [flowConfig, name, description, status, schedule, id]);

            if (res.rowCount === 0) {
                await client.query('ROLLBACK');
                return NextResponse.json({ error: 'Pipeline not found' }, { status: 404 });
            }

            // 2. Create Version (if flowConfig changed or forced)
            if (flowConfig) {
                const { rows: versionRows } = await client.query(
                    `SELECT COALESCE(MAX(version), 0) + 1 as next_version FROM pipeline_versions WHERE pipeline_id = $1`,
                    [id]
                );
                const nextVersion = versionRows[0].next_version;

                await client.query(
                    `INSERT INTO pipeline_versions (pipeline_id, flow_config, version, description)
                     VALUES ($1, $2, $3, $4)`,
                    [id, flowConfig, nextVersion, description || 'Updated pipeline']
                );
            }

            await client.query('COMMIT');
            return NextResponse.json({ success: true, id });
        } catch (err) {
            await client.query('ROLLBACK');
            throw err;
        } finally {
            client.release();
        }
    } catch (error) {
        console.error('Failed to update pipeline:', error);
        return NextResponse.json({ error: 'Failed to update pipeline' }, { status: 500 });
    }
}

// DELETE /api/pipelines/[id]
export async function DELETE(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const client = await pool.connect();
        try {
            await client.query('DELETE FROM pipelines WHERE id = $1', [id]);
            return NextResponse.json({ success: true });
        } finally {
            client.release();
        }
    } catch (error) {
        console.error('Failed to delete pipeline:', error);
        return NextResponse.json({ error: 'Failed to delete pipeline' }, { status: 500 });
    }
}
