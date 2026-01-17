
import { NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
    connectionString: process.env.POSTGRES_URL || process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

export const dynamic = 'force-dynamic';

// GET /api/pipelines - List all pipelines
export async function GET() {
    try {
        const client = await pool.connect();
        try {
            // Fetch all pipelines, including status info
            // Join with latest execution for status? Or just pipeline status?
            // User requested status. Assuming 'status' column added in migration.

            const res = await client.query(`
                SELECT p.id, p.name, p.status, p.updated_at, p.description, p.schedule,
                       (SELECT status FROM pipeline_executions pe WHERE pe.pipeline_id = p.id ORDER BY started_at DESC LIMIT 1) as last_run_status,
                       (SELECT started_at FROM pipeline_executions pe WHERE pe.pipeline_id = p.id ORDER BY started_at DESC LIMIT 1) as last_run_at,
                       (
                           SELECT json_agg(json_build_object('status', pe.status, 'started_at', pe.started_at) ORDER BY pe.started_at DESC)
                           FROM (
                               SELECT status, started_at 
                               FROM pipeline_executions 
                               WHERE pipeline_id = p.id 
                               ORDER BY started_at DESC 
                               LIMIT 5
                           ) pe
                       ) as recent_executions
                FROM pipelines p
                ORDER BY p.updated_at DESC
            `);

            return NextResponse.json(res.rows);
        } finally {
            client.release();
        }
    } catch (error) {
        console.error('Failed to list pipelines:', error);
        return NextResponse.json({ error: 'Failed to list pipelines' }, { status: 500 });
    }
}

// POST /api/pipelines - Create new pipeline
export async function POST(req: Request) {
    try {
        const { name, description, schedule } = await req.json();

        if (!name) {
            return NextResponse.json({ error: 'Name is required' }, { status: 400 });
        }

        const client = await pool.connect();
        try {
            const res = await client.query(`
                INSERT INTO pipelines (name, description, schedule, flow_config, status)
                VALUES ($1, $2, $3, '{}', 'PAUSED')
                RETURNING id, name, description, schedule, status, created_at
            `, [name, description || null, schedule || null]);

            return NextResponse.json(res.rows[0]);
        } finally {
            client.release();
        }
    } catch (error) {
        console.error('Failed to create pipeline:', error);
        return NextResponse.json({ error: 'Failed to create pipeline' }, { status: 500 });
    }
}
