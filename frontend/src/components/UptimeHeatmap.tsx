// 24h uptime heatmap: 48 vertical bars at 30min each. Each bar is colored by
// the aggregate status of the checks that landed in its window:
//   - all UP       → emerald (ok)
//   - mixed        → amber  (warn)
//   - all DOWN     → red    (bad)
//   - no data      → muted
//
// Complements the sparkline (which shows response-time shape) by giving a
// dense at-a-glance view of availability.
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';

interface Point {
  t: string;
  rt: number | null;
  ok: boolean;
}

interface Bucket {
  start: Date;
  end: Date;
  total: number;
  ok: number;
}

const BUCKETS = 48;
const BUCKET_MS = (24 * 60 * 60 * 1000) / BUCKETS;

export function UptimeHeatmap({ data }: { data: Point[] }) {
  const now = Date.now();
  const startMs = now - 24 * 60 * 60 * 1000;

  const buckets: Bucket[] = Array.from({ length: BUCKETS }, (_, i) => ({
    start: new Date(startMs + i * BUCKET_MS),
    end: new Date(startMs + (i + 1) * BUCKET_MS),
    total: 0,
    ok: 0,
  }));

  for (const p of data) {
    const ts = new Date(p.t).getTime();
    const idx = Math.floor((ts - startMs) / BUCKET_MS);
    if (idx < 0 || idx >= BUCKETS) continue;
    buckets[idx]!.total += 1;
    if (p.ok) buckets[idx]!.ok += 1;
  }

  return (
    <TooltipProvider delayDuration={80}>
      <div className="flex items-center gap-[3px]">
        {buckets.map((b, i) => {
          let cls = 'bg-muted';
          let label = 'No data';
          if (b.total > 0) {
            if (b.ok === b.total) {
              cls = 'bg-ok/80 hover:bg-ok';
              label = `100% up · ${b.total} checks`;
            } else if (b.ok === 0) {
              cls = 'bg-bad/80 hover:bg-bad';
              label = `0% up · ${b.total} checks`;
            } else {
              cls = 'bg-warn/80 hover:bg-warn';
              const pct = Math.round((b.ok / b.total) * 100);
              label = `${pct}% up · ${b.total} checks`;
            }
          }
          const timeLabel = `${formatClock(b.start)} – ${formatClock(b.end)}`;
          return (
            <Tooltip key={i}>
              <TooltipTrigger asChild>
                <div className={`h-10 flex-1 cursor-pointer rounded-[3px] transition-colors ${cls}`} />
              </TooltipTrigger>
              <TooltipContent side="top">
                <div className="font-mono text-[11px] text-muted-foreground">{timeLabel}</div>
                <div className="font-medium">{label}</div>
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </TooltipProvider>
  );
}

function formatClock(d: Date): string {
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}
