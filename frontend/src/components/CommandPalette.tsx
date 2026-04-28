// CTRL + K command palette. Fetches the user's monitors from cache so opening it is
// instant, then offers fuzzy navigation and a few actions.
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Activity, LogOut, Moon, Plus, Sun } from 'lucide-react';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from './ui/command';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { useTheme } from '../lib/theme';
import type { Monitor } from '../types';

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { logout } = useAuth();
  const { resolvedTheme, toggle } = useTheme();

  // Same queryKey as the dashboard so we hit the cache — opening the palette
  // never triggers a fresh network round-trip if the dashboard is loaded.
  const { data: monitors } = useQuery({
    queryKey: ['monitors'],
    queryFn: async () => {
      const res = await api.get<{ monitors: Monitor[] }>('/monitors');
      return res.data.monitors;
    },
  });

  // Global ⌘K / Ctrl+K handler.
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  const run = (fn: () => void) => {
    setOpen(false);
    fn();
  };

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Search monitors or run a command…" />
      <CommandList>
        <CommandEmpty>No results.</CommandEmpty>

        {monitors && monitors.length > 0 && (
          <CommandGroup heading="Monitors">
            {monitors.map((m) => (
              <CommandItem
                key={m.id}
                value={`${m.name} ${m.url}`}
                onSelect={() => run(() => navigate(`/monitors/${m.id}`))}
              >
                <Activity className="text-muted-foreground" />
                <span>{m.name}</span>
                <span className="ml-auto truncate font-mono text-xs text-muted-foreground">{m.url}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        <CommandSeparator />

        <CommandGroup heading="Actions">
          <CommandItem value="new monitor create" onSelect={() => run(() => navigate('/dashboard?new=1'))}>
            <Plus /> New monitor
          </CommandItem>
          <CommandItem value="toggle theme dark light" onSelect={() => run(toggle)}>
            {resolvedTheme === 'dark' ? <Sun /> : <Moon />}
            Toggle {resolvedTheme === 'dark' ? 'light' : 'dark'} mode
          </CommandItem>
          <CommandItem value="sign out logout" onSelect={() => run(() => void logout())}>
            <LogOut /> Sign out
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
