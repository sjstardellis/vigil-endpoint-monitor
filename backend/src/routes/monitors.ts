import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { authRequired } from '../middleware/auth';
import { createMonitorSchema, updateMonitorSchema } from '../schemas/monitors';

export const monitorsRouter = Router();
monitorsRouter.use(authRequired);

monitorsRouter.get('/', async (req, res) => {
  const monitors = await prisma.monitor.findMany({
    where: { userId: req.userId! },
    orderBy: { createdAt: 'desc' },
    include: {
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

monitorsRouter.post('/', async (req, res) => {
  const parse = createMonitorSchema.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: 'Invalid input', details: parse.error.flatten().fieldErrors });
    return;
  }
  const monitor = await prisma.monitor.create({
    data: { ...parse.data, userId: req.userId! },
  });
  res.status(201).json({ monitor });
});

monitorsRouter.get('/:id', async (req, res) => {
  const id = req.params.id;
  if (!id) {
    res.status(400).json({ error: 'Missing id' });
    return;
  }
  const monitor = await prisma.monitor.findFirst({
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
  res.json({ monitor });
});

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
  res.status(204).send();
});
