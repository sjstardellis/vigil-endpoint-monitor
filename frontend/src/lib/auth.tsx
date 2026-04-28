// Auth state exposed to the rest of the app via React Context.
//
// The provider owns "who is the current user", handles login/register/logout,
// and on mount validates any persisted token by calling GET /auth/me. The
// rest of the app just calls useAuth() — it doesn't need to know where the
// token lives or how refresh works.
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { api } from './api';
import { tokenStore } from './tokens';
import type { AuthResponse, User } from '../types';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  // `loading` is true until we've checked localStorage + verified the token.
  // ProtectedRoute uses this to avoid a "login flash" during page refresh.
  const [loading, setLoading] = useState(true);

  // On mount: if we have a stored access token, ask the server who we are.
  // A 401 here will trigger api.ts's refresh interceptor automatically.
  useEffect(() => {
    const token = tokenStore.getAccess();
    if (!token) {
      setLoading(false);
      return;
    }
    api
      .get<{ user: User }>('/auth/me')
      .then((res) => setUser(res.data.user))
      .catch(() => {
        tokenStore.clear();
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  // login and register hit different endpoints but share the same response
  // shape, so we fold them into one helper.
  const handleAuth = async (path: '/auth/login' | '/auth/register', email: string, password: string) => {
    const { data } = await api.post<AuthResponse>(path, { email, password });
    tokenStore.set(data.accessToken, data.refreshToken);
    setUser(data.user);
  };

  const login = (email: string, password: string) => handleAuth('/auth/login', email, password);
  const register = (email: string, password: string) => handleAuth('/auth/register', email, password);

  const logout = async () => {
    // Tell the server to revoke the refresh token so it can't be reused.
    // We swallow errors here — even if the server is unreachable, we still
    // want to clear local state.
    const refreshToken = tokenStore.getRefresh();
    if (refreshToken) {
      await api.post('/auth/logout', { refreshToken }).catch(() => {});
    }
    tokenStore.clear();
    setUser(null);
  };

  return <AuthContext.Provider value={{ user, loading, login, register, logout }}>{children}</AuthContext.Provider>;
}

// Components call useAuth() to read/modify auth state. Throws if used outside
// the provider — a clearer error than the silent undefined that React returns.
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
