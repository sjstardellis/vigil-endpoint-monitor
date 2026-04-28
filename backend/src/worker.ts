// Worker process entrypoint (run with `npm run dev:worker`).
//
// We run the worker as a *separate* Node process from the API (src/index.ts)
// so they can scale and crash independently: a runaway check never takes the
// API down, and we can later add more worker replicas if needed. Both
// processes connect to the same Postgres + Redis.
import { env } from './lib/env';
import { log } from './lib/logger';
import { prisma } from './lib/prisma';
import { redis } from './lib/redis';
import { rescheduleAllMonitors } from './jobs/scheduler';
import { createCheckWorker } from './jobs/worker';

async function main() {
  log.info('worker_starting', { nodeEnv: env.NODE_ENV });
  const worker = createCheckWorker();
  // Re-hydrate the BullMQ schedule from the database. If Redis was flushed
  // or the worker is running for the first time, this rebuilds every
  // repeatable job so enabled monitors resume being checked.
  await rescheduleAllMonitors();
  log.info('worker_ready');

  // Graceful shutdown: stop accepting new jobs, close DB + Redis cleanly
  // so in-flight checks finish and resources are released.
  const shutdown = async (signal: string) => {
    log.info('worker_shutdown_requested', { signal });
    await worker.close();
    await prisma.$disconnect();
    redis.disconnect();
    process.exit(0);
  };

  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
}

main().catch((err) => {
  log.error('worker_fatal', { error: err instanceof Error ? err.message : String(err) });
  process.exit(1);
});
