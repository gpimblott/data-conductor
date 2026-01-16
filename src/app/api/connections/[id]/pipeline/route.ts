/*
 * DataConductor
 * Copyright (C) 2026
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        const { rows } = await db.query(
            `SELECT * FROM pipelines WHERE connection_id = $1 ORDER BY created_at DESC LIMIT 1`,
            [id]
        );

        if (rows.length === 0) {
            return NextResponse.json({ flowConfig: null });
        }

        return NextResponse.json(rows[0]);
    } catch (error) {
        console.error('Failed to get pipeline:', error);
        return NextResponse.json(
            { error: 'Failed to get pipeline' },
            { status: 500 }
        );
    }
}

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const body = await request.json();
        const { flowConfig, name, isActive } = body;

        // Check if pipeline exists
        const { rows } = await db.query(
            `SELECT id FROM pipelines WHERE connection_id = $1`,
            [id]
        );

        let pipelineId;

        if (rows.length > 0) {
            // Update
            pipelineId = rows[0].id;
            await db.query(
                `UPDATE pipelines 
                 SET flow_config = $1, updated_at = NOW(), name = COALESCE($2, name), is_active = COALESCE($3, is_active)
                 WHERE id = $4`,
                [flowConfig, name, isActive, pipelineId]
            );
        } else {
            // Create
            const res = await db.query(
                `INSERT INTO pipelines (connection_id, name, flow_config, is_active)
                 VALUES ($1, $2, $3, $4)
                 RETURNING id`,
                [id, name || 'Default Pipeline', flowConfig, isActive !== undefined ? isActive : true]
            );
            pipelineId = res.rows[0].id;
        }

        return NextResponse.json({ success: true, id: pipelineId });
    } catch (error) {
        console.error('Failed to save pipeline:', error);
        return NextResponse.json(
            { error: 'Failed to save pipeline' },
            { status: 500 }
        );
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        await db.query(
            `DELETE FROM pipelines WHERE connection_id = $1`,
            [id]
        );
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Failed to delete pipeline:', error);
        return NextResponse.json(
            { error: 'Failed to delete pipeline' },
            { status: 500 }
        );
    }
}
