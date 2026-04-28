// Scheduling layer: translates monitor lifecycle events (create / update /
// delete / worker startup) into BullMQ repeatable jobs.
//
// BullMQ "repeatable" jobs automatically re-enqueue themselves at a fixed
// interval. Once registered, Redis owns the schedule — the API server can
// crash and the schedule persists.
import { prisma } from '../lib/prisma';
import { log } from '../lib/logger';
import { checkQueue, repeatJobId } from './queue';

// Register (or re-register) the recurring check for a monitor.
// We always unschedule first so changes to `intervalSeconds` take effect —
// BullMQ would otherwise keep the old interval alongside the new one.
export async function scheduleMonitor(monitorId: string, intervalSeconds: number): Promise<void> {
  const jobId = repeatJobId(monitorId);
  await unscheduleMonitor(monitorId);
  await checkQueue.add(
    'check',
    { monitorId },
    {
      jobId,
      repeat: { every: intervalSeconds * 1000 },
    },
  );
  // Fire one check immediately so the user sees a result without waiting
  // a full interval. Unique id prevents duplicates if this runs twice.
  await checkQueue.add('check', { monitorId }, { jobId: `${jobId}:initial` });
}

// Remove the repeatable job. Safe to call even if nothing is scheduled.
export async function unscheduleMonitor(monitorId: string): Promise<void> {
  const repeatable = await checkQueue.getRepeatableJobs();
  const jobId = repeatJobId(monitorId);
  for (const job of repeatable) {
    if (job.id === jobId) {
      // removeRepeatableByKey takes the internal BullMQ key (includes the
      // cron/every expression), not the human-readable id.
      await checkQueue.removeRepeatableByKey(job.key);
    }
  }
}

// Called once when the worker process boots. Walks every enabled monitor in
// the DB and (re)registers its schedule. This makes the system self-healing:
// if Redis is wiped or the worker moves to a new host, we rebuild state from
// the source of truth (Postgres).
export async function rescheduleAllMonitors(): Promise<void> {
  const monitors = await prisma.monitor.findMany({
    where: { enabled: true },
    select: { id: true, intervalSeconds: true },
  });
  log.info('scheduler_reseed', { count: monitors.length });
  for (const m of monitors) {
    await scheduleMonitor(m.id, m.intervalSeconds);
  }
}
