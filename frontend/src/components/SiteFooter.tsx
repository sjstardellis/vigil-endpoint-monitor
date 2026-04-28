// Shared app-wide footer. Used everywhere via Layout (authed pages) and
// directly by public pages. Auth-aware: nav links shift based on session.
import { Link } from 'react-router-dom';
import { Activity } from 'lucide-react';
import { useAuth } from '../lib/auth';

export function SiteFooter() {
  const { user } = useAuth();

  return (
    <footer className="relative z-10 border-t border-border bg-background/80 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl flex-col items-start gap-3 px-6 py-5 text-[12px] text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <Activity className="h-3.5 w-3.5 text-primary" />
          <span>© {new Date().getFullYear()} Vigil</span>
          <span className="text-muted-foreground/40">·</span>
          <span>MIT License</span>
          <span className="text-muted-foreground/40">·</span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-ok" />
            all systems operational
          </span>
        </div>
        <nav className="flex items-center gap-4">
          <Link to="/about" className="transition-colors hover:text-foreground">
            Documentation
          </Link>
          {user ? (
            <Link to="/dashboard" className="transition-colors hover:text-foreground">
              Dashboard
            </Link>
          ) : (
            <>
              <Link to="/login" className="transition-colors hover:text-foreground">
                Sign in
              </Link>
              <Link to="/register" className="transition-colors hover:text-foreground">
                Register
              </Link>
            </>
          )}
        </nav>
      </div>
    </footer>
  );
}
