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
import fs from 'fs';
import path from 'path';

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string; fileId: string }> }
) {
    try {
        const { id, fileId } = await params;

        // Fetch the log entry to get the file path
        const { rows } = await db.query(
            `SELECT details
             FROM connection_logs
             WHERE id = $1 AND connection_id = $2`,
            [fileId, id]
        );

        if (rows.length === 0) {
            return NextResponse.json({ error: 'File record not found' }, { status: 404 });
        }

        const details = rows[0].details || {};
        const filePath = details.filePath;

        if (!filePath) {
            return NextResponse.json({ error: 'File path not found in record' }, { status: 404 });
        }

        // Security check: ensure the file is within the data directory
        // In a real app we might want stricter checks, but this is a local tool
        if (!fs.existsSync(filePath)) {
            return NextResponse.json({ error: 'File not found on disk' }, { status: 404 });
        }

        const content = fs.readFileSync(filePath, 'utf-8');

        // Determine content type (though we likely just send JSON/text)
        // For simplicity, we just send text/plain or application/json based on extension
        const contentType = filePath.endsWith('.json') ? 'application/json' : 'text/plain';

        return new NextResponse(content, {
            headers: { 'Content-Type': contentType }
        });

    } catch (error) {
        console.error('Failed to fetch file content:', error);
        return NextResponse.json(
            { error: 'Failed to fetch file content' },
            { status: 500 }
        );
    }
}
