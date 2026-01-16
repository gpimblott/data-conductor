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


import { db } from '@/lib/db';

export type LogEventType = 'CREATE' | 'UPDATE' | 'DELETE' | 'SYNC' | 'PIPELINE';
export type LogStatus = 'SUCCESS' | 'FAILURE' | 'INFO';

export async function logEvent(
    connectionId: string | null,
    connectionName: string,
    eventType: LogEventType,
    status: LogStatus,
    message: string,
    details?: any
) {
    try {
        await db.query(
            `INSERT INTO connection_logs (connection_id, connection_name, event_type, status, message, details)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [connectionId, connectionName, eventType, status, message, details ? JSON.stringify(details) : null]
        );
    } catch (error) {
        console.error('Failed to log event:', error);
        // We do not throw here to prevent logging failures from blocking main application logic
    }
}
