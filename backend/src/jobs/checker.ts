// The actual "check" — fetch the monitored URL, decide if it's up or down,
// persist the result, and open/resolve incidents when the status changes.
//
// This module is called from the BullMQ worker (src/jobs/worker.ts).
import { CheckStatus, MonitorStatus } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { log } from '../lib/logger';
import { sendIncidentOpened, sendIncidentResolved } from '../lib/notifications';

export interface CheckResult {
  status: CheckStatus;
  statusCode: number | null;
  responseTimeMs: number | null;
  errorMessage: string | null;
}

// Single HTTP request with a hard timeout. AbortController + setTimeout is
// the standard idiom for "cancel fetch after N ms" in Node's built-in fetch.
async function performHttpCheck(
  url: string,
  method: string,
  expectedStatus: number,
  timeoutMs: number,
): Promise<CheckResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const started = Date.now();
  try {
    const response = await fetch(url, {
      method,
      signal: controller.signal,
      redirect: 'follow',
      headers: { 'user-agent': 'EndpointMonitor/1.0' },
    });
    const elapsed = Date.now() - started;
    // "Up" means the response code matches exactly what the user configured.
    // We don't treat any 2xx as up — the user might specifically want 301 etc.
    if (response.status === expectedStatus) {
      return { status: 'UP', statusCode: response.status, responseTimeMs: elapsed, errorMessage: null };
    }
    return {
      status: 'DOWN',
      statusCode: response.status,
      responseTimeMs: elapsed,
      errorMessage: `Expected ${expectedStatus}, got ${response.status}`,
    };
  } catch (err) {
    // Network error or timeout. AbortError is thrown when our timer fires.
    const elapsed = Date.now() - started;
    const aborted = err instanceof Error && err.name === 'AbortError';
    const message = aborted
      ? `Timed out after ${timeoutMs}ms`
      : err instanceof Error
        ? err.message
        : 'Unknown error';
    return { status: 'DOWN', statusCode: null, responseTimeMs: elapsed, errorMessage: message };
  } finally {
    clearTimeout(timer);
  }
}

// Orchestrates a single run: load monitor → HTTP request → persist → notify.
export async function runCheck(monitorId: string): Promise<void> {
  // Monitor may have been deleted or paused between the job being enqueued
  // and the worker picking it up. Bail cleanly in both cases.
  const monitor = await prisma.monitor.findUnique({
    where: { id: monitorId },
    include: { user: { select: { email: true } } },
  });
  if (!monitor || !monitor.enabled) {
    log.info('check_skipped', { monitorId, reason: !monitor ? 'missing' : 'disabled' });
    return;
  }

  const result = await performHttpCheck(monitor.url, monitor.method, monitor.expectedStatus, monitor.timeoutMs);
  const newStatus: MonitorStatus = result.status === 'UP' ? 'UP' : 'DOWN';
  const previousStatus = monitor.status;

  // One DB transaction keeps the Check record, Monitor status update, and
  // Incident open/close atomic — readers never see a half-updated state
  // (e.g. monitor.status = DOWN but no incident row yet).
  await prisma.$transaction(async (tx) => {
    await tx.check.create({
      data: {
        monitorId: monitor.id,
        status: result.status,
        statusCode: result.statusCode,
        responseTimeMs: result.responseTimeMs,
        errorMessage: result.errorMessage,
      },
    });
    await tx.monitor.update({
      where: { id: monitor.id },
      data: { status: newStatus, lastCheckedAt: new Date() },
    });

    // Incident lifecycle:
    //   PENDING/UP -> DOWN : open a new incident
    //   DOWN       -> UP   : resolve the open incident
    //   PENDING    -> UP   : no incident (first successful check)
    //   X          -> X    : nothing
    if (newStatus === 'DOWN' && previousStatus !== 'DOWN') {
      await tx.incident.create({
        data: { monitorId: monitor.id, reason: result.errorMessage ?? 'Check failed' },
      });
    } else if (newStatus === 'UP' && previousStatus === 'DOWN') {
      const open = await tx.incident.findFirst({
        where: { monitorId: monitor.id, resolvedAt: null },
        orderBy: { startedAt: 'desc' },
      });
      if (open) {
        await tx.incident.update({ where: { id: open.id }, data: { resolvedAt: new Date() } });
      }
    }
  });

  log.info('check_done', {
    monitorId,
    status: newStatus,
    statusCode: result.statusCode,
    responseTimeMs: result.responseTimeMs,
  });

  // Emails go *outside* the transaction. Hitting an external API (Resend)
  // inside a DB transaction would hold row locks while we wait on the
  // network — bad for throughput and risks timing out the transaction.
  if (newStatus === 'DOWN' && previousStatus !== 'DOWN') {
    await sendIncidentOpened({
      to: monitor.user.email,
      monitorName: monitor.name,
      monitorUrl: monitor.url,
      reason: result.errorMessage ?? 'Check failed',
    });
  } else if (newStatus === 'UP' && previousStatus === 'DOWN') {
    await sendIncidentResolved({
      to: monitor.user.email,
      monitorName: monitor.name,
      monitorUrl: monitor.url,
    });
  }
}
