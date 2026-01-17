/*
 * DataConductor
 * Copyright (C) 2026
 */

import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string, versionId: string }> }
) {
    try {
        const { versionId } = await params;

        const { rows } = await db.query(
            `SELECT * FROM pipeline_versions WHERE id = $1`,
            [versionId]
        );

        if (rows.length === 0) {
            return NextResponse.json({ error: 'Version not found' }, { status: 404 });
        }

        return NextResponse.json(rows[0]);
    } catch (error) {
        console.error('Failed to get pipeline version:', error);
        return NextResponse.json(
            { error: 'Failed to get pipeline version' },
            { status: 500 }
        );
    }
}
