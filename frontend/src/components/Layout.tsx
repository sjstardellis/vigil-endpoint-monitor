// Authed-page shell: shared header + footer + global Ctrl+K palette mount.
// Anything rendered inside ProtectedRoute lives here.
import type { ReactNode } from 'react';
import { Outlet } from 'react-router-dom';
import { CommandPalette } from './CommandPalette';
import { SiteFooter } from './SiteFooter';
import { SiteHeader } from './SiteHeader';

export function Layout({ children }: { children?: ReactNode }) {
  return (
    <div className="flex min-h-full flex-col bg-background">
      <SiteHeader showSearch />
      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-8">
        {children ?? <Outlet />}
      </main>
      <SiteFooter />
      <CommandPalette />
    </div>
  );
}
