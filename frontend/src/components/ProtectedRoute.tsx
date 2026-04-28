// Guards child routes: if the user isn't logged in, redirect to /login.
//
// Rendered as a parent route via <Route element={<ProtectedRoute />}> in
// App.tsx. The <Outlet /> is where child routes render once the guard
// passes.
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../lib/auth';

export function ProtectedRoute() {
  const { user, loading } = useAuth();
  // While we're still checking the stored token (on first page load),
  // show a spinner instead of flashing the login page.
  if (loading) {
    return <div className="flex h-full items-center justify-center text-slate-500">Loading…</div>;
  }
  if (!user) return <Navigate to="/login" replace />;
  return <Outlet />;
}
