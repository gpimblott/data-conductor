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

export const dynamic = 'force-dynamic';

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        // Query logs for successful SYNC events
        // Fetch more than 5 to account for potential deleted files
        const { rows } = await db.query(
            `SELECT id, created_at, details
             FROM connection_logs
             WHERE connection_id = $1
               AND event_type = 'SYNC'
               AND status = 'SUCCESS'
               AND details->>'filePath' IS NOT NULL
             ORDER BY created_at DESC
             LIMIT 50`,
            [id]
        );

        const files = rows.map(row => {
            const details = row.details || {};
            return {
                id: row.id,
                createdAt: row.created_at,
                filePath: details.filePath,
                fileSize: details.fileSize
            };
        })
            .filter(f => {
                if (!f.filePath) return false;
                // If it's an S3 URL, assume it exists for now (or implement S3 HEAD check)
                if (f.filePath.startsWith('s3://')) return true;
                // Local file check
                return fs.existsSync(f.filePath);
            })
            .slice(0, 5); // Return only top 5 existing files

        return NextResponse.json(files);
    } catch (error) {
        console.error('Failed to list files:', error);
        return NextResponse.json(
            { error: 'Failed to list files' },
            { status: 500 }
        );
    }
}
