import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { redis } from '../lib/redis';

export const healthRouter = Router();

healthRouter.get('/', async (_req, res) => {
  const checks: Record<string, 'ok' | 'error'> = {
    api: 'ok',
    db: 'error',
    redis: 'error',
  };

  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.db = 'ok';
  } catch {
    checks.db = 'error';
  }

  try {
    const pong = await redis.ping();
    if (pong === 'PONG') checks.redis = 'ok';
  } catch {
    checks.redis = 'error';
  }

  const ok = Object.values(checks).every((v) => v === 'ok');
  res.status(ok ? 200 : 503).json(checks);
});
