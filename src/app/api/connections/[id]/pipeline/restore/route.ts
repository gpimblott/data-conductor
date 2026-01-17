/*
 * DataConductor
 * Copyright (C) 2026
 */

import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const body = await request.json();
        const { versionId } = body;

        if (!versionId) {
            return NextResponse.json({ error: 'Version ID is required' }, { status: 400 });
        }

        // 1. Get the version to restore
        const { rows: versionRows } = await db.query(
            `SELECT pipeline_id, flow_config, version FROM pipeline_versions WHERE id = $1`,
            [versionId]
        );

        if (versionRows.length === 0) {
            return NextResponse.json({ error: 'Version not found' }, { status: 404 });
        }

        const targetVersion = versionRows[0];
        const pipelineId = targetVersion.pipeline_id;
        const configToRestore = targetVersion.flow_config;

        // 2. Update the main pipeline table (Head)
        await db.query(
            `UPDATE pipelines 
             SET flow_config = $1, updated_at = NOW()
             WHERE id = $2`,
            [configToRestore, pipelineId]
        );

        // 3. Create a NEW version entry explicitly stating it was a revert
        // Get next version number
        const { rows: nextVerRows } = await db.query(
            `SELECT COALESCE(MAX(version), 0) + 1 as next_version FROM pipeline_versions WHERE pipeline_id = $1`,
            [pipelineId]
        );
        const nextVersion = nextVerRows[0].next_version;

        await db.query(
            `INSERT INTO pipeline_versions (pipeline_id, flow_config, version, description)
             VALUES ($1, $2, $3, $4)`,
            [pipelineId, configToRestore, nextVersion, `Reverted to version ${targetVersion.version}`]
        );

        return NextResponse.json({ success: true, newVersion: nextVersion });
    } catch (error) {
        console.error('Failed to restore pipeline version:', error);
        return NextResponse.json(
            { error: 'Failed to restore pipeline version' },
            { status: 500 }
        );
    }
}
