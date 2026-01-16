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

import cron from 'node-cron';
// @ts-ignore
import { parseExpression } from 'cron-parser';
import { db } from './db';
import { syncConnection } from './sync';

let task: any = null;

export function startScheduler() {
    if (task) {
        console.log('Scheduler already running.');
        return;
    }

    console.log('Starting Master Scheduler...');

    // Run every minute
    task = cron.schedule('* * * * *', async () => {
        console.log('Scheduler: Checking for due connections...');
        try {
            const { rows } = await db.query(
                `SELECT * FROM connections WHERE schedule IS NOT NULL AND status = 'ACTIVE'`
            );

            for (const conn of rows) {
                if (shouldSync(conn)) {
                    console.log(`Scheduler: Triggering sync for ${conn.name}`);
                    // We trigger sync providing the ID. syncConnection handles DB status updates.
                    // We don't await this to run in parallel? 
                    // Better to await to avoid overwhelming if many feeds? 
                    // Let's await for now to be safe.
                    await syncConnection(conn.id).catch(err =>
                        console.error(`Scheduler: Failed to sync ${conn.name}`, err)
                    );
                }
            }
        } catch (error) {
            console.error('Scheduler Error:', error);
        }
    });
}

function shouldSync(conn: any): boolean {
    const { schedule, last_synced_at } = conn;

    // 1. Never synced? Sync immediately.
    if (!last_synced_at) return true;

    const lastSync = new Date(last_synced_at);
    const now = new Date();

    // 2. Schedule is simple minutes (e.g. "15")
    if (/^\d+$/.test(schedule)) {
        const minutes = parseInt(schedule, 10);
        // Floor the lastSync to the minute to avoid second-level drift causing off-by-one minute delays
        lastSync.setSeconds(0, 0);
        const nextDue = new Date(lastSync.getTime() + minutes * 60000);
        return now >= nextDue;
    }

    // 3. Schedule is Cron
    try {
        const interval = parseExpression(schedule);
        // Get the most recent scheduled run time *before* now
        const prevScheduledRun = interval.prev().toDate();

        // If the previous scheduled run is NEWER than the last actual sync, we are due.
        // Example: Run @ 12:00. Last Sync @ 11:00. 12:00 > 11:00 -> True.
        // Example: Run @ 12:05. Last Sync @ 12:00. 12:05 > 12:00 -> True.
        // Example: Run @ 12:05. Last Sync @ 12:05:30. 12:05 < 12:05:30 -> False.
        return prevScheduledRun > lastSync;
    } catch (err) {
        console.error(`Invalid schedule format for ${conn.name}: ${schedule}`);
        return false;
    }
}
