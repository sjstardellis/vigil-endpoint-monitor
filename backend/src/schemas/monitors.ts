import { z } from 'zod';

export const createMonitorSchema = z.object({
  name: z.string().trim().min(1).max(100),
  url: z.string().url().max(2048),
  method: z.enum(['GET', 'HEAD', 'POST']).default('GET'),
  expectedStatus: z.number().int().min(100).max(599).default(200),
  intervalSeconds: z.number().int().min(60).max(3600).default(300),
  timeoutMs: z.number().int().min(1000).max(30000).default(10000),
});

export const updateMonitorSchema = z
  .object({
    name: z.string().trim().min(1).max(100),
    url: z.string().url().max(2048),
    method: z.enum(['GET', 'HEAD', 'POST']),
    expectedStatus: z.number().int().min(100).max(599),
    intervalSeconds: z.number().int().min(60).max(3600),
    timeoutMs: z.number().int().min(1000).max(30000),
    enabled: z.boolean(),
  })
  .partial();
