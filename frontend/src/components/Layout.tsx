// App chrome: brand, CTRL/CMD hint button, theme toggle, user menu.
import type { ReactNode } from 'react';
import { Link, Outlet } from 'react-router-dom';
import { Activity, BookOpen, ChevronDown, LogOut, Search } from 'lucide-react';
import { Button } from './ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { Kbd } from './ui/kbd';
import { ThemeToggle } from './ThemeToggle';
import { CommandPalette } from './CommandPalette';
import { useAuth } from '../lib/auth';

export function Layout({ children }: { children?: ReactNode }) {
  const { user, logout } = useAuth();

  const openPalette = () => {
    // Synthesize the same shortcut the global listener watches for.
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true, bubbles: true }));
  };

  return (
    <div className="min-h-full bg-background">
      <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-4 px-6">
          <Link to="/" className="flex items-center gap-2 font-semibold text-foreground">
            <Activity className="h-4 w-4 text-primary" />
            <span className="text-sm tracking-tight">Vigil</span>
          </Link>

          <div className="ml-auto flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={openPalette}
              className="hidden items-center gap-2 text-muted-foreground sm:inline-flex"
            >
              <Search className="h-3.5 w-3.5" />
              <span className="text-xs">Search…</span>
              <span className="ml-4 flex items-center gap-1">
                <Kbd>CTRL</Kbd>
                <Kbd>K</Kbd>
              </span>
            </Button>

            <ThemeToggle />

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-1.5">
                  <span className="font-mono text-xs text-muted-foreground">{user?.email}</span>
                  <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/about">
                    <BookOpen /> Documentation
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => void logout()} className="text-destructive focus:text-destructive">
                  <LogOut /> Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8">
        {children ?? <Outlet />}
      </main>

      <CommandPalette />
    </div>
  );
}
