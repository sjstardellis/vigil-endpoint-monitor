// Public documentation / user guide for Vigil. Reachable via the hero header,
// the hero footer, the authed user dropdown, and direct URL /about.
import { Link } from 'react-router-dom';
import { ArrowRight, BookOpen, Boxes, Command, Eye, Keyboard, Lock, Server, Sparkles, Wrench } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { SiteFooter } from '../components/SiteFooter';
import { SiteHeader } from '../components/SiteHeader';
import { VimStatusBar } from './HeroPage';

interface Section {
  id: string;
  label: string;
  icon: typeof Sparkles;
}

const SECTIONS: Section[] = [
  { id: 'what-is-vigil', label: 'What is Vigil?', icon: Sparkles },
  { id: 'quickstart', label: 'Quickstart', icon: ArrowRight },
  { id: 'concepts', label: 'Core concepts', icon: Boxes },
  { id: 'add-monitor', label: 'Adding a monitor', icon: Server },
  { id: 'dashboard', label: 'Reading the dashboard', icon: Eye },
  { id: 'palette', label: 'Command palette', icon: Command },
  { id: 'shortcuts', label: 'Keyboard shortcuts', icon: Keyboard },
  { id: 'security', label: 'Account & security', icon: Lock },
  { id: 'self-host', label: 'Self-hosting', icon: Wrench },
  { id: 'faq', label: 'FAQ', icon: BookOpen },
];

export function AboutPage() {
  return (
    <div className="relative flex min-h-full flex-col bg-background">
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10 opacity-50 [background-image:radial-gradient(hsl(var(--border))_1px,transparent_1px)] [background-size:22px_22px]"
      />
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(ellipse_at_top_right,hsl(var(--primary)/0.10),transparent_55%)]"
      />

      <SiteHeader />

      <main className="relative z-10 mx-auto w-full max-w-6xl flex-1 px-6 py-12 lg:py-16">
        <div className="mb-8 flex items-center gap-2 text-[11px] uppercase tracking-wider text-muted-foreground">
          <BookOpen className="h-3 w-3" />
          <span>~/documentation</span>
        </div>

        <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1fr_220px] lg:gap-12">
          <div className="min-w-0 space-y-12">
            <header>
              <h1 className="text-4xl font-semibold tracking-tight text-foreground lg:text-5xl">
                Vigil <span className="text-muted-foreground/60">·</span>{' '}
                <span className="text-primary">Documentation</span>
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground">
                Everything you need to know to run Vigil end to end — from
                creating your first monitor to reading the heatmap, using the
                command palette, and self-hosting the whole stack.
              </p>
            </header>

            <Section id="what-is-vigil" title="What is Vigil?">
              <p>
                Vigil is a self-hosted uptime monitoring tool. It runs HTTP
                checks against your endpoints on a configurable interval,
                tracks response times and status codes, and surfaces failures
                as incidents that auto-resolve when service comes back.
              </p>
              <p>
                It's intentionally small: a single Express API, a BullMQ
                worker, a Postgres + Redis pair, and a React frontend. Nothing
                else. You can read the entire codebase in an afternoon.
              </p>
            </Section>

            <Section id="quickstart" title="Quickstart">
              <ol className="list-decimal space-y-2 pl-5 text-sm text-muted-foreground">
                <li>
                  <Link to="/register" className="text-primary hover:underline">
                    Create an account
                  </Link>{' '}
                  with an email and a password (8+ chars).
                </li>
                <li>
                  On the dashboard, click <Code>+ New monitor</Code> or press <Kbd>CTRL + K</Kbd> and type
                  "new monitor".
                </li>
                <li>
                  Fill in a URL, choose a method, and pick an interval.
                </li>
                <li>Within a few seconds, your first check fires. Watch it appear in the table.</li>
              </ol>
              <Tip>
                The worker schedules an immediate check on creation, then
                queues the next one according to the configured interval.
              </Tip>
            </Section>

            <Section id="concepts" title="Core concepts">
              <p>Four nouns make up the entire data model:</p>
              <Table className="mt-3">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[140px]">Term</TableHead>
                    <TableHead>Definition</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell className="font-mono text-xs text-foreground">Monitor</TableCell>
                    <TableCell className="text-muted-foreground">
                      A configured endpoint to check (URL + method + interval). You own it.
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-mono text-xs text-foreground">Check</TableCell>
                    <TableCell className="text-muted-foreground">
                      A single HTTP request result. Captures status code, response time, and error.
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-mono text-xs text-foreground">Incident</TableCell>
                    <TableCell className="text-muted-foreground">
                      Auto-opened when a check fails, auto-resolved when one succeeds.
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-mono text-xs text-foreground">Status</TableCell>
                    <TableCell className="text-muted-foreground">
                      <Code>UP</Code>, <Code>DOWN</Code>, or <Code>PENDING</Code> (no checks yet).
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </Section>

            <Section id="add-monitor" title="Adding a monitor">
              <p>
                Open the create form via the dashboard's <Code>+ New monitor</Code> button or
                from the command palette. Field reference:
              </p>
              <Table className="mt-3">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[160px]">Field</TableHead>
                    <TableHead>What it does</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <FieldRow name="Name" desc="Display name. Anything human-readable." />
                  <FieldRow
                    name="URL"
                    desc="Full URL including https://. Must be reachable from the worker container."
                  />
                  <FieldRow
                    name="Method"
                    desc="GET, HEAD, or POST. HEAD is cheapest if your endpoint supports it."
                  />
                  <FieldRow
                    name="Expected status"
                    desc="HTTP status that means up — usually 200, but 204 / 301 / 401 etc. all work."
                  />
                  <FieldRow
                    name="Interval"
                    desc="Seconds between checks. Range 60–3600 (1 min – 1 hour)."
                  />
                  <FieldRow
                    name="Timeout"
                    desc="Per-request timeout in ms (1000–30000). Slow responses past this count as failures."
                  />
                </TableBody>
              </Table>
              <Tip>
                You can pause a monitor without deleting it — open the detail
                page and click <Code>Pause</Code>. The worker stops scheduling
                checks until you resume.
              </Tip>
            </Section>

            <Section id="dashboard" title="Reading the dashboard">
              <p>
                Each monitor shows: live status pill, last-check relative time,
                and configured interval. Click a row to see the full detail
                view, where you'll find:
              </p>
              <ul className="ml-5 list-disc space-y-1.5 text-sm text-muted-foreground">
                <li>
                  <strong className="text-foreground">Uptime</strong> — percentage of successful checks over 24h, 7d, and 30d.
                </li>
                <li>
                  <strong className="text-foreground">Avg response · 24h</strong> — mean response time across all successful checks in the last day.
                </li>
                <li>
                  <strong className="text-foreground">Availability heatmap</strong> — last 24h split into 48 thirty-minute buckets. Green = all up,
                  amber = mixed, red = all down, grey = no data.
                </li>
                <li>
                  <strong className="text-foreground">Response-time sparkline</strong> — full series for the last 24h. Red dots mark failed checks.
                </li>
                <li>
                  <strong className="text-foreground">Incidents</strong> — chronological list with start, end, and reason. Open ones say <em className="text-destructive">Ongoing</em>.
                </li>
                <li>
                  <strong className="text-foreground">Recent checks</strong> — raw log of the latest individual results.
                </li>
              </ul>
            </Section>

            <Section id="palette" title="Command palette">
              <p>
                Press <Kbd>⌘K</Kbd> (macOS) or <Kbd>Ctrl</Kbd>+<Kbd>K</Kbd> (Windows / Linux) anywhere in the app
                to open the palette. Type to filter; <Kbd>Enter</Kbd> to run.
              </p>
              <Table className="mt-3">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[180px]">Action</TableHead>
                    <TableHead>What happens</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <FieldRow name="<monitor name>" desc="Navigate directly to that monitor's detail page." />
                  <FieldRow name="New monitor" desc="Open the create form on the dashboard." />
                  <FieldRow name="Toggle theme" desc="Switch between dark and light." />
                  <FieldRow name="Sign out" desc="Revoke your refresh token and clear local state." />
                </TableBody>
              </Table>
            </Section>

            <Section id="shortcuts" title="Keyboard shortcuts">
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  <Kbd>CTRL + K</Kbd> / <Kbd>Ctrl</Kbd>+<Kbd>K</Kbd> — open command palette
                </li>
                <li>
                  <Kbd>Esc</Kbd> — close the palette or any open dialog
                </li>
                <li>
                  <Kbd>Tab</Kbd> / <Kbd>Shift</Kbd>+<Kbd>Tab</Kbd> — move between form fields and buttons
                </li>
                <li>
                  <Kbd>Enter</Kbd> — submit the focused form
                </li>
              </ul>
            </Section>

            <Section id="security" title="Account & security">
              <ul className="ml-5 list-disc space-y-1.5 text-sm text-muted-foreground">
                <li>Passwords are hashed with bcrypt (cost factor 10) before storage — never kept in plain text.</li>
                <li>
                  Login issues a short-lived JWT access token (15 min) and a longer refresh token (7 days). The
                  frontend rotates them transparently when the access token expires.
                </li>
                <li>
                  Auth endpoints are rate-limited per IP: 10 logins / 15 min, 5 registrations / hour, 60 refreshes / 15 min.
                </li>
                <li>
                  Sign out revokes the refresh token server-side, so even a stolen token can't be reused.
                </li>
              </ul>
            </Section>

            <Section id="self-host" title="Self-hosting">
              <p>Vigil runs entirely on your own hardware. Quickstart from a fresh clone:</p>
              <CodeBlock>
                {`./scripts/setup.sh    # install deps, .env, db schema
./scripts/dev.sh      # api + worker + web + docker`}
              </CodeBlock>
              <p>
                Postgres + Redis run as Docker containers (volumes preserved between runs). Stop everything with{' '}
                <Code>./scripts/stop.sh</Code>. Inside Git Bash on Windows the same scripts work; on native
                PowerShell, run them via <Code>bash scripts/dev.sh</Code>.
              </p>
              <Tip>
                Want to inspect data directly? Run <Code>npm --prefix backend run prisma:studio</Code>{' '}
                and open <Code>localhost:5555</Code> for a click-through table view of every model.
              </Tip>
            </Section>

            <Section id="faq" title="FAQ">
              <FaqItem q="Why isn't my monitor checking?">
                Make sure the worker is running. <Code>./scripts/dev.sh</Code> starts it
                alongside the API. If you started components manually, you also need{' '}
                <Code>npm --prefix backend run dev:worker</Code>.
              </FaqItem>
              <FaqItem q="My monitor shows DOWN but the URL works in my browser.">
                The worker checks from inside its host's network. Make sure the URL is reachable from
                where Vigil runs (e.g. for local services use <Code>host.docker.internal</Code> or your
                machine's LAN IP, not <Code>localhost</Code>).
              </FaqItem>
              <FaqItem q="How do I delete my account?">
                Open Prisma Studio (<Code>npm --prefix backend run prisma:studio</Code>) and delete the
                row in the <Code>User</Code> table. All related monitors, checks, and incidents cascade.
              </FaqItem>
              <FaqItem q="Can I export my data?">
                Yes — Vigil is just Postgres. Run{' '}
                <Code>docker compose exec postgres pg_dump -U postgres endpoint_monitor</Code> for a SQL dump.
              </FaqItem>
              <FaqItem q="Does Vigil send alerts?">
                Email alerts via Resend are wired in but optional. Set <Code>RESEND_API_KEY</Code> and{' '}
                <Code>EMAIL_FROM</Code> in <Code>backend/.env</Code> to enable. Without them, incidents
                still open and resolve — they just don't notify.
              </FaqItem>
              <FaqItem q="What happens to my data on logout?">
                Nothing — logout only clears the local tokens and revokes the refresh token. Monitors,
                checks, and incidents stay in Postgres for the next session.
              </FaqItem>
            </Section>

            <div className="flex flex-wrap gap-3 border-t border-border pt-6">
              <Button asChild>
                <Link to="/register">
                  Register <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link to="/login">Sign in</Link>
              </Button>
            </div>
          </div>

          <aside className="lg:sticky lg:top-20 lg:self-start">
            <Card className="p-4">
              <div className="mb-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                Contents
              </div>
              <nav className="flex flex-col gap-0.5 text-[12px]">
                {SECTIONS.map((s, i) => {
                  const Icon = s.icon;
                  return (
                    <a
                      key={s.id}
                      href={`#${s.id}`}
                      className="flex items-center gap-2 rounded-sm px-2 py-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    >
                      <span className="w-5 text-right text-muted-foreground/40">
                        {String(i + 1).padStart(2, '0')}
                      </span>
                      <Icon className="h-3 w-3 shrink-0" />
                      <span className="truncate">{s.label}</span>
                    </a>
                  );
                })}
              </nav>
            </Card>
          </aside>
        </div>
      </main>

      <SiteFooter />
      <VimStatusBar />
    </div>
  );
}

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-20">
      <h2 className="mb-4 flex items-center gap-3 text-2xl font-semibold tracking-tight text-foreground">
        <span className="text-primary">#</span>
        {title}
      </h2>
      <div className="space-y-3 text-[14px] leading-relaxed text-muted-foreground">{children}</div>
    </section>
  );
}

function FieldRow({ name, desc }: { name: string; desc: string }) {
  return (
    <TableRow>
      <TableCell className="font-mono text-xs text-foreground">{name}</TableCell>
      <TableCell className="text-muted-foreground">{desc}</TableCell>
    </TableRow>
  );
}

function FaqItem({ q, children }: { q: string; children: React.ReactNode }) {
  return (
    <div className="rounded-md border border-border bg-card p-4">
      <div className="mb-1.5 text-[14px] font-medium text-foreground">{q}</div>
      <div className="text-[13px] leading-relaxed text-muted-foreground">{children}</div>
    </div>
  );
}

function Code({ children }: { children: React.ReactNode }) {
  return (
    <code className="rounded-sm border border-border bg-muted px-1.5 py-0.5 font-mono text-[12px] text-foreground">
      {children}
    </code>
  );
}

function CodeBlock({ children }: { children: React.ReactNode }) {
  return (
    <pre className="overflow-x-auto rounded-md border border-border bg-card p-4 text-[12px] leading-6 text-foreground">
      <code>{children}</code>
    </pre>
  );
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex items-center rounded-sm border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px] text-foreground">
      {children}
    </kbd>
  );
}

function Tip({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-3 rounded-md border-l-2 border-primary bg-primary/5 px-4 py-3 text-[13px] leading-relaxed text-muted-foreground">
      <span className="mr-2 font-semibold text-primary">tip</span>
      {children}
    </div>
  );
}
