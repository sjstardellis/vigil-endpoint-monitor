// Email notifications via Resend (https://resend.com).
//
// This module degrades gracefully: if RESEND_API_KEY or EMAIL_FROM isn't
// configured, every send becomes a no-op. That lets the app work locally
// without any email account, and production just sets the env vars.
import { Resend } from 'resend';
import { env } from './env';
import { log } from './logger';

// `resend` is null when not configured — we branch on it below so a missing
// key never throws.
const resend = env.RESEND_API_KEY ? new Resend(env.RESEND_API_KEY) : null;

interface IncidentOpenedArgs {
  to: string;
  monitorName: string;
  monitorUrl: string;
  reason: string;
}

interface IncidentResolvedArgs {
  to: string;
  monitorName: string;
  monitorUrl: string;
}

function canSend(): boolean {
  if (!resend || !env.EMAIL_FROM) {
    log.info('email_skipped', { reason: 'resend_not_configured' });
    return false;
  }
  return true;
}

export async function sendIncidentOpened(args: IncidentOpenedArgs): Promise<void> {
  if (!canSend() || !resend || !env.EMAIL_FROM) return;
  try {
    await resend.emails.send({
      from: env.EMAIL_FROM,
      to: args.to,
      subject: `[DOWN] ${args.monitorName}`,
      html: `<p><strong>${args.monitorName}</strong> is down.</p><p>URL: <code>${args.monitorUrl}</code></p><p>Reason: ${args.reason}</p>`,
    });
    log.info('email_sent', { type: 'incident_opened', to: args.to });
  } catch (err) {
    // Never let an email failure crash a check. Log and move on.
    log.error('email_error', { type: 'incident_opened', error: err instanceof Error ? err.message : String(err) });
  }
}

export async function sendIncidentResolved(args: IncidentResolvedArgs): Promise<void> {
  if (!canSend() || !resend || !env.EMAIL_FROM) return;
  try {
    await resend.emails.send({
      from: env.EMAIL_FROM,
      to: args.to,
      subject: `[UP] ${args.monitorName} resolved`,
      html: `<p><strong>${args.monitorName}</strong> is back up.</p><p>URL: <code>${args.monitorUrl}</code></p>`,
    });
    log.info('email_sent', { type: 'incident_resolved', to: args.to });
  } catch (err) {
    log.error('email_error', { type: 'incident_resolved', error: err instanceof Error ? err.message : String(err) });
  }
}
