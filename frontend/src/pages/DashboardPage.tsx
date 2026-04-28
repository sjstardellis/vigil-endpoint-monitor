// Dashboard: monitor list + inline create form. Uses shadcn primitives and
// shows a CTRL/CMD + K hint when empty.
import { FormEvent, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ChevronRight, Loader2, Plus } from 'lucide-react';
import { api } from '../lib/api';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { StatusBadge } from '../components/StatusBadge';
import type { Monitor } from '../types';

interface CreateMonitorInput {
  name: string;
  url: string;
  method: 'GET' | 'HEAD' | 'POST';
  expectedStatus: number;
  intervalSeconds: number;
  timeoutMs: number;
}

function formatRelative(iso: string | null): string {
  if (!iso) return '—';
  const diff = Date.now() - new Date(iso).getTime();
  const secs = Math.floor(diff / 1000);
  if (secs < 60) return `${secs}s ago`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export function DashboardPage() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();

  // Command palette deep-link: /?new=1 opens the create form.
  useEffect(() => {
    if (searchParams.get('new') === '1') {
      setShowForm(true);
      searchParams.delete('new');
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const { data, isLoading, error } = useQuery({
    queryKey: ['monitors'],
    queryFn: async () => {
      const res = await api.get<{ monitors: Monitor[] }>('/monitors');
      return res.data.monitors;
    },
    refetchInterval: 15_000,
  });

  const createMutation = useMutation({
    mutationFn: async (input: CreateMonitorInput) => {
      const res = await api.post<{ monitor: Monitor }>('/monitors', input);
      return res.data.monitor;
    },
    onSuccess: (m) => {
      qc.invalidateQueries({ queryKey: ['monitors'] });
      setShowForm(false);
      toast.success('Monitor created', { description: `Now watching ${m.name}.` });
    },
    onError: () => toast.error('Could not create monitor.'),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Monitors</h1>
          <p className="text-sm text-muted-foreground">Live uptime status across your endpoints.</p>
        </div>
        <Button onClick={() => setShowForm((v) => !v)} variant={showForm ? 'outline' : 'default'}>
          {showForm ? 'Cancel' : (
            <>
              <Plus /> New monitor
            </>
          )}
        </Button>
      </div>

      {showForm && <CreateMonitorForm onSubmit={(input) => createMutation.mutate(input)} pending={createMutation.isPending} />}

      {isLoading && <div className="text-sm text-muted-foreground">Loading…</div>}
      {error && <div className="text-sm text-destructive">Failed to load monitors.</div>}

      {data && data.length === 0 && (
        <Card className="flex flex-col items-center gap-2 border-dashed p-10 text-center">
          <p className="text-sm text-muted-foreground">No monitors yet.</p>
          <p className="text-xs text-muted-foreground">
            Click <span className="font-medium text-foreground">New monitor</span> above, or press{' '}
            <span className="rounded border bg-muted px-1.5 py-0.5 font-mono text-[10px]">CTRL + K</span> to open the command palette.
          </p>
        </Card>
      )}

      {data && data.length > 0 && (
        <Card className="overflow-hidden p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>URL</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last check</TableHead>
                <TableHead>Interval</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((m) => (
                <TableRow key={m.id}>
                  <TableCell>
                    <Link to={`/monitors/${m.id}`} className="font-medium text-foreground hover:text-primary">
                      {m.name}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <span className="font-mono text-xs text-muted-foreground">{m.url}</span>
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={m.status} />
                  </TableCell>
                  <TableCell className="text-muted-foreground">{formatRelative(m.lastCheckedAt)}</TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">{m.intervalSeconds}s</TableCell>
                  <TableCell className="w-10">
                    <Link to={`/monitors/${m.id}`} className="text-muted-foreground hover:text-foreground">
                      <ChevronRight className="h-4 w-4" />
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}

function CreateMonitorForm({ onSubmit, pending }: { onSubmit: (input: CreateMonitorInput) => void; pending: boolean }) {
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [method, setMethod] = useState<'GET' | 'HEAD' | 'POST'>('GET');
  const [expectedStatus, setExpectedStatus] = useState(200);
  const [intervalSeconds, setIntervalSeconds] = useState(300);
  const [timeoutMs, setTimeoutMs] = useState(10000);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    onSubmit({ name, url, method, expectedStatus, intervalSeconds, timeoutMs });
  };

  return (
    <Card className="p-6">
      <form onSubmit={submit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2 space-y-1.5">
          <Label htmlFor="m-name">Name</Label>
          <Input id="m-name" required value={name} onChange={(e) => setName(e.target.value)} placeholder="Production API" />
        </div>
        <div className="sm:col-span-2 space-y-1.5">
          <Label htmlFor="m-url">URL</Label>
          <Input
            id="m-url"
            required
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://api.example.com/health"
            className="font-mono"
          />
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
          <Label htmlFor="m-expected">Expected status</Label>
          <Input
            id="m-expected"
            type="number"
            min={100}
            max={599}
            value={expectedStatus}
            onChange={(e) => setExpectedStatus(Number(e.target.value))}
            className="font-mono"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="m-interval">Interval (seconds)</Label>
          <Input
            id="m-interval"
            type="number"
            min={60}
            max={3600}
            value={intervalSeconds}
            onChange={(e) => setIntervalSeconds(Number(e.target.value))}
            className="font-mono"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="m-timeout">Timeout (ms)</Label>
          <Input
            id="m-timeout"
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
            {pending ? 'Creating…' : 'Create monitor'}
          </Button>
        </div>
      </form>
    </Card>
  );
}
