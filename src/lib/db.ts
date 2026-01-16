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

import { Pool } from 'pg';

// Avoid creating multiple pools in dev hot-reloading
const globalForDb = global as unknown as { db: Pool };

export const db =
    globalForDb.db ||
    new Pool({
        connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/data_expert',
    });

if (process.env.NODE_ENV !== 'production') globalForDb.db = db;

export interface ConnectionRow {
    id: string;
    name: string;
    type: string;
    source_url: string;
    status: string;
    last_synced_at: Date | null;
    created_at: Date;
}
