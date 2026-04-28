// HTTP API for managing monitors. All routes require auth — a user can only
// see and modify their own monitors (enforced by `where: { userId }` on every
// query). Mutations also sync the BullMQ schedule so a create/update/delete
// is reflected in what the worker actually runs.
import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { authRequired } from '../middleware/auth';
import { scheduleMonitor, unscheduleMonitor } from '../jobs/scheduler';
import { createMonitorSchema, updateMonitorSchema } from '../schemas/monitors';

export const monitorsRouter = Router();
// Apply auth once for the whole router — every route below assumes req.userId.
monitorsRouter.use(authRequired);

// List the current user's monitors with their most recent check result.
monitorsRouter.get('/', async (req, res) => {
  const monitors = await prisma.monitor.findMany({
    where: { userId: req.userId! },
    orderBy: { createdAt: 'desc' },
    include: {
      // `take: 1` + descending order = "just the latest check". This avoids
      // N+1 queries on the dashboard.
      checks: {
        orderBy: { checkedAt: 'desc' },
        take: 1,
        select: { status: true, statusCode: true, responseTimeMs: true, checkedAt: true },
      },
      _count: { select: { checks: true, incidents: true } },
    },
  });
  res.json({ monitors });
});

// Create a monitor and immediately schedule its recurring check.
monitorsRouter.post('/', async (req, res) => {
  const parse = createMonitorSchema.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: 'Invalid input', details: parse.error.flatten().fieldErrors });
    return;
  }
  const monitor = await prisma.monitor.create({
    data: { ...parse.data, userId: req.userId! },
  });
  // Tell BullMQ to start running checks. `scheduleMonitor` also fires one
  // immediate check so the user sees a result within seconds.
  await scheduleMonitor(monitor.id, monitor.intervalSeconds);
  res.status(201).json({ monitor });
});

// Fetch a single monitor with recent history for the detail page.
monitorsRouter.get('/:id', async (req, res) => {
  const id = req.params.id;
  if (!id) {
    res.status(400).json({ error: 'Missing id' });
    return;
  }
  const monitor = await prisma.monitor.findFirst({
    // findFirst + userId filter = authorization check — a user can't fetch
    // someone else's monitor even if they guess the id.
    where: { id, userId: req.userId! },
    include: {
      checks: {
        orderBy: { checkedAt: 'desc' },
        take: 100,
      },
      incidents: {
        orderBy: { startedAt: 'desc' },
        take: 20,
      },
    },
  });
  if (!monitor) {
    res.status(404).json({ error: 'Monitor not found' });
    return;
  }
  res.json({ monitor });
});

// Partial update. The schema allows any subset of fields, so this handles
// both "edit config" and "pause/resume" (toggling `enabled`).
monitorsRouter.patch('/:id', async (req, res) => {
  const id = req.params.id;
  if (!id) {
    res.status(400).json({ error: 'Missing id' });
    return;
  }
  const parse = updateMonitorSchema.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: 'Invalid input', details: parse.error.flatten().fieldErrors });
    return;
  }
  const existing = await prisma.monitor.findFirst({
    where: { id, userId: req.userId! },
    select: { id: true },
  });
  if (!existing) {
    res.status(404).json({ error: 'Monitor not found' });
    return;
  }
  const monitor = await prisma.monitor.update({
    where: { id: existing.id },
    data: parse.data,
  });
  // Sync the schedule to match the new state. `scheduleMonitor` unschedules
  // first internally, so calling it again picks up a changed intervalSeconds.
  if (monitor.enabled) {
    await scheduleMonitor(monitor.id, monitor.intervalSeconds);
  } else {
    await unscheduleMonitor(monitor.id);
  }
  res.json({ monitor });
});

// Aggregate uptime + performance stats for the detail page's KPI cards and
// response-time sparkline. All windows are relative to "now" and are cheap
// thanks to the (monitorId, checkedAt) index.
monitorsRouter.get('/:id/stats', async (req, res) => {
  const id = req.params.id;
  if (!id) {
    res.status(400).json({ error: 'Missing id' });
    return;
  }
  const monitor = await prisma.monitor.findFirst({
    where: { id, userId: req.userId! },
    select: { id: true },
  });
  if (!monitor) {
    res.status(404).json({ error: 'Monitor not found' });
    return;
  }

  const now = Date.now();
  const windows = {
    '24h': new Date(now - 24 * 60 * 60 * 1000),
    '7d': new Date(now - 7 * 24 * 60 * 60 * 1000),
    '30d': new Date(now - 30 * 24 * 60 * 60 * 1000),
  };

  // Uptime % per window: groupBy status counts, then UP / total.
  // `null` means no data in that window (avoid showing "0% uptime" for an
  // unmonitored period).
  async function uptimeFor(since: Date): Promise<number | null> {
    const rows = await prisma.check.groupBy({
      by: ['status'],
      where: { monitorId: id, checkedAt: { gte: since } },
      _count: { _all: true },
    });
    const total = rows.reduce((acc, r) => acc + r._count._all, 0);
    if (total === 0) return null;
    const up = rows.find((r) => r.status === 'UP')?._count._all ?? 0;
    return Math.round((up / total) * 10000) / 100; // two decimal places
  }

  const [uptime24h, uptime7d, uptime30d, avg24h, incidents30d, series] = await Promise.all([
    uptimeFor(windows['24h']),
    uptimeFor(windows['7d']),
    uptimeFor(windows['30d']),
    prisma.check.aggregate({
      where: { monitorId: id, checkedAt: { gte: windows['24h'] }, responseTimeMs: { not: null } },
      _avg: { responseTimeMs: true },
      _count: { _all: true },
    }),
    prisma.incident.count({ where: { monitorId: id, startedAt: { gte: windows['30d'] } } }),
    // Sparkline data: raw 24h checks ordered oldest → newest so the chart
    // reads left-to-right. Cap to 500 to bound payload size even with
    // 60s intervals (24h @ 60s = 1440 points; at 500 we'd cover ~8h).
    prisma.check.findMany({
      where: { monitorId: id, checkedAt: { gte: windows['24h'] } },
      orderBy: { checkedAt: 'asc' },
      take: 500,
      select: { checkedAt: true, responseTimeMs: true, status: true },
    }),
  ]);

  res.json({
    uptime: { '24h': uptime24h, '7d': uptime7d, '30d': uptime30d },
    avgResponseMs24h: avg24h._avg.responseTimeMs !== null ? Math.round(avg24h._avg.responseTimeMs) : null,
    totalChecks24h: avg24h._count._all,
    incidents30d,
    series24h: series.map((c) => ({
      t: c.checkedAt.toISOString(),
      rt: c.responseTimeMs,
      ok: c.status === 'UP',
    })),
  });
});

// Delete also tears down the schedule. Prisma cascades to Check and Incident
// rows via `onDelete: Cascade` in the schema.
monitorsRouter.delete('/:id', async (req, res) => {
  const id = req.params.id;
  if (!id) {
    res.status(400).json({ error: 'Missing id' });
    return;
  }
  const existing = await prisma.monitor.findFirst({
    where: { id, userId: req.userId! },
    select: { id: true },
  });
  if (!existing) {
    res.status(404).json({ error: 'Monitor not found' });
    return;
  }
  await prisma.monitor.delete({ where: { id: existing.id } });
  await unscheduleMonitor(existing.id);
  res.status(204).send();
});
