// BullMQ queue setup. BullMQ is a Redis-backed job queue: the API adds jobs,
// the worker process (src/worker.ts) pulls them off Redis and runs them. We
// use "repeatable" jobs so each monitor re-enqueues itself on its own interval
// without us needing a cron.
import { Queue, QueueEvents } from 'bullmq';
import { redis } from '../lib/redis';

export const CHECK_QUEUE_NAME = 'monitor-checks';

// Shape of the job payload. Everything the worker needs to look up and run
// a check lives in the DB, so we only pass the id.
export interface CheckJobData {
  monitorId: string;
}

export const checkQueue = new Queue<CheckJobData>(CHECK_QUEUE_NAME, {
  connection: redis,
  defaultJobOptions: {
    // Trim completed/failed jobs so Redis doesn't grow unbounded.
    removeOnComplete: { age: 3600, count: 1000 },
    removeOnFail: { age: 24 * 3600, count: 1000 },
    // We retry on the next scheduled interval rather than using BullMQ retries,
    // so a transient failure doesn't spam the target.
    attempts: 1,
  },
});

// QueueEvents listens to queue-level events (completed, failed, etc.) for
// observability. BullMQ requires QueueEvents to use its *own* Redis connection
// because it uses blocking commands — sharing with the main queue would stall
// other queue operations. `.duplicate()` clones the connection settings.
export const checkQueueEvents = new QueueEvents(CHECK_QUEUE_NAME, { connection: redis.duplicate() });

// We derive a stable job id from the monitor id so scheduling the same monitor
// twice doesn't create duplicate repeatable jobs — BullMQ de-dupes by id/key.
export function repeatJobId(monitorId: string): string {
  return `monitor:${monitorId}`;
}
