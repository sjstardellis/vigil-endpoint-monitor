import 'express-async-errors';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { env } from './lib/env';
import { log } from './lib/logger';
import { authRouter } from './routes/auth';
import { healthRouter } from './routes/health';
import { monitorsRouter } from './routes/monitors';

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }));
  app.use(express.json({ limit: '1mb' }));

  app.use('/health', healthRouter);
  app.use('/auth', authRouter);
  app.use('/monitors', monitorsRouter);

  app.use((_req, res) => {
    res.status(404).json({ error: 'Not found' });
  });

  app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    const message = err instanceof Error ? err.message : 'Internal server error';
    log.error('unhandled error', { message });
    res.status(500).json({ error: 'Internal server error' });
  });

  return app;
}
