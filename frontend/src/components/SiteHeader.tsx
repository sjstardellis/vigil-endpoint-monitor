// Shared app-wide header. Auth-aware: signed-out users see Sign in / Get
// started CTAs; signed-in users see the account dropdown and (when in the
// authed shell) a Ctrl+K search button. Used by Layout for protected pages
// and directly by public pages (hero, manual, login, register).
import { Link } from 'react-router-dom';
import { Activity, ArrowRight, BookOpen, ChevronDown, LayoutDashboard, LogOut, Search } from 'lucide-react';
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
import { useAuth } from '../lib/auth';

interface SiteHeaderProps {
  // Show the Ctrl+K search trigger. Only meaningful where CommandPalette is
  // mounted (i.e. inside the authed Layout), so callers opt in.
  showSearch?: boolean;
}

export function SiteHeader({ showSearch = false }: SiteHeaderProps) {
  const { user, logout } = useAuth();

  const openPalette = () => {
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true, bubbles: true }));
  };

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center gap-6 px-6">
        <Link to="/" className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold tracking-tight">Vigil</span>
        </Link>

        <nav className="hidden items-center gap-5 text-[13px] sm:flex">
          <Link to="/about" className="text-muted-foreground transition-colors hover:text-foreground">
            Documentation
          </Link>
          {user && (
            <Link to="/dashboard" className="text-muted-foreground transition-colors hover:text-foreground">
              Dashboard
            </Link>
          )}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          {showSearch && user && (
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
          )}

          <ThemeToggle />

          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-1.5">
                  <span className="font-mono text-xs text-muted-foreground">{user.email}</span>
                  <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/dashboard">
                    <LayoutDashboard /> Dashboard
                  </Link>
                </DropdownMenuItem>
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
          ) : (
            <>
              <Button asChild variant="ghost" size="sm">
                <Link to="/login">Sign in</Link>
              </Button>
              <Button asChild size="sm">
                <Link to="/register">
                  Register <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
