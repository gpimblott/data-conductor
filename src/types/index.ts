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

export type ConnectionType = 'RSS' | 'HTTP' | 'DATABASE';

export interface Connection {
    id: string;
    name: string;
    type: ConnectionType;
    sourceUrl: string;
    status: 'ACTIVE' | 'IDLE' | 'ERROR' | 'SYNCING' | 'PAUSED';
    lastSyncedAt?: Date;
    lastSyncSize?: number;
    recentSyncStatuses?: ('SUCCESS' | 'FAILURE')[];
    schedule?: string;
    // Normalized fields (optional depending on type)
    connectionString?: string;
    sqlQuery?: string;
    username?: string;
    password?: string;
    options?: { convertXml?: boolean;[key: string]: any };
}
