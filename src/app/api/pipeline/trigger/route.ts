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
import { findLatestDownload, runEntityPipeline } from '@/lib/pipeline';

export async function POST(request: Request) {
    try {
        const { connectionId } = await request.json();

        if (!connectionId) {
            return NextResponse.json({ error: 'Connection ID is required' }, { status: 400 });
        }

        // 1. Get Connection Details
        const { rows } = await db.query('SELECT name FROM connections WHERE id = $1', [connectionId]);

        if (rows.length === 0) {
            return NextResponse.json({ error: 'Connection not found' }, { status: 404 });
        }

        const connectionName = rows[0].name;

        // 2. Find Latest Download
        const inputFilePath = await findLatestDownload(connectionName);

        if (!inputFilePath) {
            return NextResponse.json({ error: 'No data found for this connection. Please sync first.' }, { status: 404 });
        }

        // 3. Run Pipeline
        const result = await runEntityPipeline(connectionId, connectionName, inputFilePath);

        if (result.success) {
            return NextResponse.json({ success: true, message: 'Pipeline executed successfully' });
        } else {
            return NextResponse.json({ success: false, error: result.error }, { status: 500 });
        }

    } catch (error: any) {
        console.error('Pipeline API Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
