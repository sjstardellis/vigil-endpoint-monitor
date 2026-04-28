// Public landing page. Hero copy + animated ~/pings.log terminal panel.
// Header and footer are the app-wide shared components.
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, BookOpen, Check, X } from 'lucide-react';
import { Button } from '../components/ui/button';
import { SiteFooter } from '../components/SiteFooter';
import { SiteHeader } from '../components/SiteHeader';
import { useAuth } from '../lib/auth';

interface LogEntry {
  id: number;
  ts: string;
  method: string;
  path: string;
  status: number;
  ms: number;
  ok: boolean;
}

const ENDPOINTS: Array<Pick<LogEntry, 'method' | 'path'>> = [
  { method: 'GET', path: '/api/health' },
  { method: 'GET', path: '/api/checkout' },
  { method: 'HEAD', path: '/cdn/assets' },
  { method: 'GET', path: '/api/auth/session' },
  { method: 'POST', path: '/api/webhooks' },
  { method: 'GET', path: '/graphql' },
  { method: 'GET', path: '/v1/metrics' },
];

const ERROR_CODES = [500, 503, 504, 502];

function pad2(n: number): string {
  return n.toString().padStart(2, '0');
}

function nowHMS(): string {
  const d = new Date();
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;
}

function seedLogs(): LogEntry[] {
  const now = Date.now();
  const out: LogEntry[] = [];
  for (let i = 7; i >= 0; i--) {
    const d = new Date(now - i * 1400);
    const ep = ENDPOINTS[i % ENDPOINTS.length]!;
    const ok = i !== 5;
    out.push({
      id: -i - 1,
      ts: `${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`,
      method: ep.method,
      path: ep.path,
      status: ok ? 200 : 503,
      ms: ok ? 20 + Math.floor(Math.random() * 140) : 4012,
      ok,
    });
  }
  return out;
}

export function HeroPage() {
  const { user } = useAuth();
  const [logs, setLogs] = useState<LogEntry[]>(() => seedLogs());
  const idRef = useRef(1);

  useEffect(() => {
    let timer: number;
    const tick = () => {
      const ep = ENDPOINTS[Math.floor(Math.random() * ENDPOINTS.length)]!;
      const ok = Math.random() > 0.14;
      const entry: LogEntry = {
        id: idRef.current++,
        ts: nowHMS(),
        method: ep.method,
        path: ep.path,
        status: ok ? 200 : ERROR_CODES[Math.floor(Math.random() * ERROR_CODES.length)]!,
        ms: ok ? 10 + Math.floor(Math.random() * 240) : 1800 + Math.floor(Math.random() * 3200),
        ok,
      };
      setLogs((prev) => [...prev.slice(-13), entry]);
      timer = window.setTimeout(tick, 700 + Math.random() * 1100);
    };
    timer = window.setTimeout(tick, 900);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <div className="relative flex min-h-full flex-col bg-background">
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10 opacity-50 [background-image:radial-gradient(hsl(var(--border))_1px,transparent_1px)] [background-size:22px_22px]"
      />
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(ellipse_at_top_right,hsl(var(--primary)/0.14),transparent_55%)]"
      />

      <SiteHeader />

      <main className="relative z-10 mx-auto grid w-full max-w-6xl flex-1 grid-cols-1 gap-12 px-6 py-10 lg:grid-cols-[1.05fr_1fr] lg:gap-10 lg:py-16">
        <div className="flex flex-col justify-center">
          <div className="mb-8 inline-flex w-fit items-center gap-2 rounded-sm border border-border bg-card px-3 py-1 text-[11px] uppercase tracking-wider text-muted-foreground">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full rounded-full bg-ok opacity-75 animate-pulse-ring" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-ok" />
            </span>
            <span>status · operational</span>
          </div>

          <h1 className="text-5xl font-semibold leading-[1.05] tracking-tight text-foreground lg:text-6xl">
            Never miss
            <br />
            when your API
            <br />
            <span className="text-primary">
              blinks.
              <span className="ml-1 inline-block h-[0.85em] w-[0.12em] translate-y-[0.08em] animate-blink bg-primary align-middle" />
            </span>
          </h1>

          <p className="mt-7 max-w-lg text-base leading-relaxed text-muted-foreground">
            Vigil keeps watch over your endpoints with second-precision uptime
            checks, latency heatmaps, incident tracking, and a{' '}
            <span className="rounded-sm border border-border bg-card px-1.5 py-0.5 text-xs">CTRL + K</span>{' '}
            for-everything interface. Self-hosted. Open source.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            {user ? (
              <Button asChild size="lg">
                <Link to="/dashboard">
                  Go to dashboard <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            ) : (
              <Button asChild size="lg">
                <Link to="/register">
                  Create account <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            )}
            <Button asChild variant="outline" size="lg">
              <Link to="/about">
                <BookOpen className="h-4 w-4" /> Read the documentation
              </Link>
            </Button>
          </div>

          <div className="mt-10 flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
            {['node', 'express', 'postgres', 'redis', 'bullmq', 'react', 'vite'].map((t) => (
              <span key={t} className="rounded-sm border border-border bg-card px-2 py-0.5">
                {t}
              </span>
            ))}
          </div>
        </div>

        <div className="flex flex-col justify-center">
          <div
            aria-hidden
            className="relative overflow-hidden rounded-md border border-border bg-card shadow-2xl shadow-primary/5"
          >
            <div className="flex items-center gap-2 border-b border-border bg-background/60 px-3 py-2">
              <span className="h-2.5 w-2.5 rounded-full bg-bad/70" />
              <span className="h-2.5 w-2.5 rounded-full bg-warn/70" />
              <span className="h-2.5 w-2.5 rounded-full bg-ok/70" />
              <span className="ml-3 text-[11px] text-muted-foreground">~/pings.log — watching 3 monitors</span>
            </div>
            <div className="relative h-[360px] overflow-hidden p-3 text-[12px] leading-6">
              <div className="flex flex-col">
                {logs.map((log) => (
                  <div key={log.id} className="flex animate-fade-in items-center gap-3 whitespace-nowrap">
                    <span className="text-muted-foreground">[{log.ts}]</span>
                    <span className="w-10 text-muted-foreground">{log.method}</span>
                    <span className="w-40 truncate text-foreground">{log.path}</span>
                    <span className={log.ok ? 'w-10 text-ok' : 'w-10 text-bad'}>{log.status}</span>
                    <span className="w-16 text-right text-muted-foreground">{log.ms}ms</span>
                    {log.ok ? (
                      <Check className="h-3.5 w-3.5 shrink-0 text-ok" />
                    ) : (
                      <X className="h-3.5 w-3.5 shrink-0 text-bad" />
                    )}
                  </div>
                ))}
              </div>
              <div className="pointer-events-none absolute inset-x-0 top-0 h-10 bg-gradient-to-b from-card to-transparent" />
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-card to-transparent" />
            </div>
            <div className="flex items-center justify-between border-t border-border bg-background/60 px-3 py-2 text-[11px] text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-ok" />
                ONLINE
              </span>
              <span>p50 142ms</span>
              <span>queue · idle</span>
            </div>
          </div>
        </div>
      </main>

      <SiteFooter />
      <VimStatusBar />
    </div>
  );
}

export function VimStatusBar() {
  return (
    <div className="sticky bottom-0 z-30 flex w-full items-center border-t border-border bg-background text-[11px]">
      <span className="bg-primary px-3 py-1 font-semibold uppercase tracking-wider text-primary-foreground">
        normal
      </span>
      <span className="px-3 py-1 text-muted-foreground">main</span>
      <span className="hidden px-3 py-1 text-muted-foreground sm:inline">~/vigil</span>
      <span className="flex-1" />
      <span className="hidden px-3 py-1 text-muted-foreground md:inline">typescript</span>
      <span className="hidden px-3 py-1 text-muted-foreground md:inline">UTF-8</span>
      <span className="px-3 py-1 text-ok">● ONLINE</span>
    </div>
  );
}
