import { createApp } from './app';
import { env } from './lib/env';
import { log } from './lib/logger';
import { prisma } from './lib/prisma';
import { redis } from './lib/redis';

async function main() {
  const app = createApp();
  const server = app.listen(env.API_PORT, () => {
    log.info('api_listening', { port: env.API_PORT, nodeEnv: env.NODE_ENV });
  });

  const shutdown = async (signal: string) => {
    log.info('shutdown_requested', { signal });
    server.close();
    await prisma.$disconnect();
    redis.disconnect();
    process.exit(0);
  };

  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
}

main().catch((err) => {
  log.error('fatal_startup_error', { error: err instanceof Error ? err.message : String(err) });
  process.exit(1);
});
