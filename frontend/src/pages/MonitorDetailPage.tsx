// Monitor detail: header + KPIs + heatmap + sparkline + incidents + checks,
// all rebuilt on shadcn primitives. Mutations use sonner toasts for feedback.
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ArrowLeft, Loader2, Pause, Pencil, Play, Trash2 } from 'lucide-react';
import { api } from '../lib/api';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Sparkline } from '../components/Sparkline';
import { StatCard } from '../components/StatCard';
import { StatusBadge } from '../components/StatusBadge';
import { UptimeHeatmap } from '../components/UptimeHeatmap';
import type { Monitor } from '../types';

interface MonitorStats {
  uptime: { '24h': number | null; '7d': number | null; '30d': number | null };
  avgResponseMs24h: number | null;
  totalChecks24h: number;
  incidents30d: number;
  series24h: Array<{ t: string; rt: number | null; ok: boolean }>;
}

function formatUptime(value: number | null): string {
  if (value === null) return '—';
  return `${value.toFixed(2)}%`;
}

interface UpdateInput {
  name?: string;
  url?: string;
  method?: 'GET' | 'HEAD' | 'POST';
  expectedStatus?: number;
  intervalSeconds?: number;
  timeoutMs?: number;
  enabled?: boolean;
}

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString();
}

export function MonitorDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ['monitor', id],
    queryFn: async () => {
      const res = await api.get<{ monitor: Monitor }>(`/monitors/${id}`);
      return res.data.monitor;
    },
    enabled: !!id,
    refetchInterval: 15_000,
  });

  const { data: stats } = useQuery({
    queryKey: ['monitor-stats', id],
    queryFn: async () => {
      const res = await api.get<MonitorStats>(`/monitors/${id}/stats`);
      return res.data;
    },
    enabled: !!id,
    refetchInterval: 15_000,
  });

  const updateMutation = useMutation({
    mutationFn: async (input: UpdateInput) => {
      const res = await api.patch<{ monitor: Monitor }>(`/monitors/${id}`, input);
      return res.data.monitor;
    },
    onSuccess: (m) => {
      qc.invalidateQueries({ queryKey: ['monitor', id] });
      qc.invalidateQueries({ queryKey: ['monitor-stats', id] });
      qc.invalidateQueries({ queryKey: ['monitors'] });
      setEditing(false);
      toast.success(m.enabled ? 'Monitor updated' : 'Monitor paused');
    },
    onError: () => toast.error('Update failed.'),
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      await api.delete(`/monitors/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['monitors'] });
      toast.success('Monitor deleted');
      navigate('/dashboard');
    },
    onError: () => toast.error('Delete failed.'),
  });

  if (isLoading) return <div className="text-sm text-muted-foreground">Loading…</div>;
  if (error || !data) return <div className="text-sm text-destructive">Monitor not found.</div>;

  return (
    <div className="space-y-6">
      <Link to="/dashboard" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3.5 w-3.5" /> All monitors
      </Link>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight">{data.name}</h1>
          <p className="font-mono text-sm text-muted-foreground">{data.url}</p>
          <div className="flex items-center gap-3 text-sm">
            <StatusBadge status={data.status} />
            <span className="text-muted-foreground">Last check: {formatDate(data.lastCheckedAt)}</span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => updateMutation.mutate({ enabled: !data.enabled })}
            disabled={updateMutation.isPending}
          >
            {data.enabled ? <Pause /> : <Play />}
            {data.enabled ? 'Pause' : 'Resume'}
          </Button>
          <Button variant="outline" size="sm" onClick={() => setEditing((v) => !v)}>
            <Pencil /> {editing ? 'Cancel' : 'Edit'}
          </Button>
          <Button variant="destructive" size="sm" onClick={() => setConfirmDelete(true)}>
            <Trash2 /> Delete
          </Button>
        </div>
      </div>

      {editing && (
        <EditForm monitor={data} onSubmit={(input) => updateMutation.mutate(input)} pending={updateMutation.isPending} />
      )}

      {stats && (
        <section className="space-y-3">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard label="Uptime · 24h" value={formatUptime(stats.uptime['24h'])} />
            <StatCard label="Uptime · 7d" value={formatUptime(stats.uptime['7d'])} />
            <StatCard label="Uptime · 30d" value={formatUptime(stats.uptime['30d'])} />
            <StatCard
              label="Avg response · 24h"
              value={stats.avgResponseMs24h !== null ? `${stats.avgResponseMs24h}ms` : '—'}
              sub={`${stats.totalChecks24h} checks · ${stats.incidents30d} incidents / 30d`}
            />
          </div>

          <Card className="p-4">
            <div className="mb-3 flex items-center justify-between">
              <div className="text-sm font-medium">Availability · last 24h</div>
              <div className="flex items-center gap-3 text-[10px] uppercase tracking-wide text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-sm bg-ok" /> Up
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-sm bg-warn" /> Mixed
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-sm bg-bad" /> Down
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-sm bg-muted" /> No data
                </span>
              </div>
            </div>
            <UptimeHeatmap data={stats.series24h} />
            <div className="mt-2 flex justify-between font-mono text-[10px] text-muted-foreground">
              <span>24h ago</span>
              <span>now</span>
            </div>
          </Card>

          <Card className="p-4">
            <div className="mb-2 flex items-center justify-between">
              <div className="text-sm font-medium">Response time · last 24h</div>
              <div className="text-xs text-muted-foreground">Red dots = failed checks</div>
            </div>
            <Sparkline data={stats.series24h} width={900} height={110} />
          </Card>
        </section>
      )}

      <section>
        <h2 className="mb-3 text-lg font-semibold tracking-tight">Incidents</h2>
        {data.incidents && data.incidents.length > 0 ? (
          <Card className="overflow-hidden p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Started</TableHead>
                  <TableHead>Resolved</TableHead>
                  <TableHead>Reason</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.incidents.map((i) => (
                  <TableRow key={i.id}>
                    <TableCell className="font-mono text-xs">{formatDate(i.startedAt)}</TableCell>
                    <TableCell className="font-mono text-xs">
                      {i.resolvedAt ? formatDate(i.resolvedAt) : <span className="text-destructive">Ongoing</span>}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{i.reason ?? '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        ) : (
          <Card className="border-dashed p-6 text-center text-sm text-muted-foreground">No incidents recorded.</Card>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold tracking-tight">Recent checks</h2>
        {data.checks && data.checks.length > 0 ? (
          <Card className="overflow-hidden p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Time</TableHead>
                  <TableHead>Result</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Response</TableHead>
                  <TableHead>Error</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.checks.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-mono text-xs">{formatDate(c.checkedAt)}</TableCell>
                    <TableCell>
                      <StatusBadge status={c.status} />
                    </TableCell>
                    <TableCell className="font-mono text-xs">{c.statusCode ?? '—'}</TableCell>
                    <TableCell className="font-mono text-xs">{c.responseTimeMs != null ? `${c.responseTimeMs}ms` : '—'}</TableCell>
                    <TableCell className="text-muted-foreground">{c.errorMessage ?? '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        ) : (
          <Card className="border-dashed p-6 text-center text-sm text-muted-foreground">
            No checks yet — the worker runs an initial check moments after creation.
          </Card>
        )}
      </section>

      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete monitor?</DialogTitle>
            <DialogDescription>
              This permanently deletes <span className="font-medium text-foreground">{data.name}</span> along with its checks
              and incident history. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setConfirmDelete(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                setConfirmDelete(false);
                deleteMutation.mutate();
              }}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function EditForm({
  monitor,
  onSubmit,
  pending,
}: {
  monitor: Monitor;
  onSubmit: (input: UpdateInput) => void;
  pending: boolean;
}) {
  const [name, setName] = useState(monitor.name);
  const [url, setUrl] = useState(monitor.url);
  const [method, setMethod] = useState<'GET' | 'HEAD' | 'POST'>(monitor.method);
  const [expectedStatus, setExpectedStatus] = useState(monitor.expectedStatus);
  const [intervalSeconds, setIntervalSeconds] = useState(monitor.intervalSeconds);
  const [timeoutMs, setTimeoutMs] = useState(monitor.timeoutMs);

  return (
    <Card className="p-6">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit({ name, url, method, expectedStatus, intervalSeconds, timeoutMs });
        }}
        className="grid grid-cols-1 gap-4 sm:grid-cols-2"
      >
        <div className="sm:col-span-2 space-y-1.5">
          <Label htmlFor="e-name">Name</Label>
          <Input id="e-name" required value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="sm:col-span-2 space-y-1.5">
          <Label htmlFor="e-url">URL</Label>
          <Input id="e-url" required type="url" value={url} onChange={(e) => setUrl(e.target.value)} className="font-mono" />
        </div>
        <div className="space-y-1.5">
          <Label>Method</Label>
          <Select value={method} onValueChange={(v) => setMethod(v as 'GET' | 'HEAD' | 'POST')}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="GET">GET</SelectItem>
              <SelectItem value="HEAD">HEAD</SelectItem>
              <SelectItem value="POST">POST</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="e-expected">Expected status</Label>
          <Input
            id="e-expected"
            type="number"
            min={100}
            max={599}
            value={expectedStatus}
            onChange={(e) => setExpectedStatus(Number(e.target.value))}
            className="font-mono"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="e-interval">Interval (seconds)</Label>
          <Input
            id="e-interval"
            type="number"
            min={60}
            max={3600}
            value={intervalSeconds}
            onChange={(e) => setIntervalSeconds(Number(e.target.value))}
            className="font-mono"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="e-timeout">Timeout (ms)</Label>
          <Input
            id="e-timeout"
            type="number"
            min={1000}
            max={30000}
            value={timeoutMs}
            onChange={(e) => setTimeoutMs(Number(e.target.value))}
            className="font-mono"
          />
        </div>
        <div className="sm:col-span-2">
          <Button type="submit" disabled={pending}>
            {pending && <Loader2 className="h-4 w-4 animate-spin" />}
            {pending ? 'Saving…' : 'Save changes'}
          </Button>
        </div>
      </form>
    </Card>
  );
}
