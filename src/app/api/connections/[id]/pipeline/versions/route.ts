/*
 * DataConductor
 * Copyright (C) 2026
 */

import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        // Get pipeline ID from connection ID
        const { rows: pipelineRows } = await db.query(
            `SELECT id FROM pipelines WHERE connection_id = $1`,
            [id]
        );

        if (pipelineRows.length === 0) {
            return NextResponse.json([]);
        }

        const pipelineId = pipelineRows[0].id;

        // Get versions
        const { rows } = await db.query(
            `SELECT id, version, description, created_at 
             FROM pipeline_versions 
             WHERE pipeline_id = $1 
             ORDER BY version DESC`,
            [pipelineId]
        );

        return NextResponse.json(rows);
    } catch (error) {
        console.error('Failed to get pipeline versions:', error);
        return NextResponse.json(
            { error: 'Failed to get pipeline versions' },
            { status: 500 }
        );
    }
}
