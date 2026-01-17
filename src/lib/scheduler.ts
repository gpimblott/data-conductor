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
import { runPipeline } from './pipeline/orchestrator';
import { addJob } from './queue/jobQueue';

let task: any = null;

export function startScheduler() {
    if (task) {
        console.log('Scheduler already running.');
        return;
    }

    console.log('Starting Master Scheduler...');

    // Run every minute
    task = cron.schedule('* * * * *', async () => {
        console.log('Scheduler: Checking for due pipelines...');
        try {
            // Fetch pipelines with schedule and their last run time
            const { rows } = await db.query(
                `SELECT p.*, 
                 (SELECT started_at FROM pipeline_executions pe WHERE pe.pipeline_id = p.id ORDER BY started_at DESC LIMIT 1) as last_run_at 
                 FROM pipelines p 
                 WHERE p.schedule IS NOT NULL AND p.schedule != '' AND p.status = 'ACTIVE'`
            );

            for (const pipeline of rows) {
                if (shouldRun(pipeline)) {
                    console.log(`Scheduler: Queuing run for pipeline ${pipeline.name} (${pipeline.id})`);
                    addJob(() => runPipeline(pipeline.id, null));
                }
            }
        } catch (error) {
            console.error('Scheduler Error:', error);
        }
    });
}

function shouldRun(pipeline: any): boolean {
    const { schedule, last_run_at } = pipeline;

    // 1. Never ran? Run immediately.
    if (!last_run_at) return true;

    const lastRun = new Date(last_run_at);
    const now = new Date();

    // 2. Schedule is simple minutes (e.g. "15")
    if (/^\d+$/.test(schedule)) {
        const minutes = parseInt(schedule, 10);
        // Floor the lastRun to the minute
        lastRun.setSeconds(0, 0);
        const nextDue = new Date(lastRun.getTime() + minutes * 60000);
        return now >= nextDue;
    }

    // 3. Schedule is Cron
    try {
        const interval = parseExpression(schedule);
        const prevScheduledRun = interval.prev().toDate();
        // If the previous scheduled run is NEWER than the last actual run, we are due.
        return prevScheduledRun > lastRun;
    } catch (err) {
        console.error(`Invalid schedule format for ${pipeline.name}: ${schedule}`);
        return false;
    }
}
