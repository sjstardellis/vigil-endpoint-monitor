// BullMQ Worker: the consumer side of the queue. Pulls check jobs off Redis
// and runs them. This file only defines the worker; the process that *runs*
// the worker is src/worker.ts.
import { Worker } from 'bullmq';
import { redis } from '../lib/redis';
import { log } from '../lib/logger';
import { CHECK_QUEUE_NAME, type CheckJobData } from './queue';
import { runCheck } from './checker';

export function createCheckWorker(): Worker<CheckJobData> {
  const worker = new Worker<CheckJobData>(
    CHECK_QUEUE_NAME,
    async (job) => {
      await runCheck(job.data.monitorId);
    },
    {
      // Worker uses blocking Redis commands (BRPOPLPUSH), so it needs its
      // own connection — sharing with the main client would block unrelated
      // queries.
      connection: redis.duplicate(),
      // Process up to 10 checks in parallel. HTTP checks are mostly I/O-
      // bound (waiting on network), so a single Node process can handle
      // many concurrent requests.
      concurrency: 10,
    },
  );

  // The processor function throwing = job "failed". We log the detail
  // centrally so we don't need try/catch in runCheck.
  worker.on('failed', (job, err) => {
    log.error('check_failed', { jobId: job?.id, monitorId: job?.data.monitorId, error: err.message });
  });

  worker.on('error', (err) => {
    log.error('worker_error', { error: err.message });
  });

  return worker;
}
