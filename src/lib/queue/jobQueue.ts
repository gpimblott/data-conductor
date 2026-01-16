import PQueue from 'p-queue';

/**
 * Global In-Memory Job Queue.
 * Limits concurrency of heavy tasks (Syncs, Pipelines).
 * Note: Jobs are not persisted and will be lost on restart.
 */
export const jobQueue = new PQueue({ concurrency: 5 });

export function addJob(task: () => Promise<any>): void {
    jobQueue.add(task).catch(err => {
        console.error('Job execution failed:', err);
    });
}
