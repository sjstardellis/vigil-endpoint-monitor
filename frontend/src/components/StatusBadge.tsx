// Status pill using theme-aware tokens. UP gets a pulsing ring so the
// dashboard reads as "live", not "stale snapshot".
import { Badge } from './ui/badge';
import { cn } from '../lib/utils';
import type { MonitorStatus } from '../types';

const LABEL: Record<MonitorStatus, string> = { UP: 'Up', DOWN: 'Down', PENDING: 'Pending' };
const VARIANT: Record<MonitorStatus, 'ok' | 'bad' | 'warn'> = {
  UP: 'ok',
  DOWN: 'bad',
  PENDING: 'warn',
};
const DOT: Record<MonitorStatus, string> = {
  UP: 'bg-ok',
  DOWN: 'bg-bad',
  PENDING: 'bg-warn',
};

export function StatusBadge({ status, className }: { status: MonitorStatus; className?: string }) {
  return (
    <Badge variant={VARIANT[status]} className={className}>
      <span className="relative flex h-2 w-2">
        {status === 'UP' && (
          <span className={cn('absolute inline-flex h-full w-full rounded-full opacity-75 animate-pulse-ring', DOT[status])} />
        )}
        <span className={cn('relative inline-flex h-2 w-2 rounded-full', DOT[status])} />
      </span>
      {LABEL[status]}
    </Badge>
  );
}
