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

        // join pipelines to get the pipeline for this connection
        const { rows } = await db.query(
            `SELECT pe.* 
             FROM pipeline_executions pe
             JOIN pipelines p ON pe.pipeline_id = p.id
             WHERE p.connection_id = $1
             ORDER BY pe.started_at DESC
             LIMIT 5`,
            [id]
        );

        return NextResponse.json(rows);
    } catch (error) {
        console.error('Failed to get pipeline executions:', error);
        return NextResponse.json(
            { error: 'Failed to get pipeline executions' },
            { status: 500 }
        );
    }
}
