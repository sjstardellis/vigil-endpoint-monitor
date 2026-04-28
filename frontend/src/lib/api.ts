// Centralized axios client. Adds the access token to every request and, when
// the server says a token is expired (401), transparently refreshes and
// retries the original request so callers never have to handle it.
import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { tokenStore } from './tokens';

export const api = axios.create({
  // baseURL '/api' is rewritten by Vite's dev proxy to http://localhost:4000
  // (see vite.config.ts). In production you'd point this at your real API.
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});

// Request interceptor: attach the access token if we have one.
api.interceptors.request.use((config) => {
  const token = tokenStore.getAccess();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// If multiple requests fire simultaneously and all get 401, we only want to
// call /auth/refresh *once* and have the others wait for that result. This
// promise acts as a "currently refreshing" lock.
let refreshInFlight: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = tokenStore.getRefresh();
  if (!refreshToken) return null;
  try {
    // Use raw axios (not the `api` instance) to avoid this call being
    // intercepted and recursing into itself.
    const { data } = await axios.post<{ accessToken: string; refreshToken: string }>(
      '/api/auth/refresh',
      { refreshToken },
    );
    tokenStore.set(data.accessToken, data.refreshToken);
    return data.accessToken;
  } catch {
    // Refresh failed = session is truly dead. Clear tokens so the app
    // redirects to login.
    tokenStore.clear();
    return null;
  }
}

// Response interceptor: on 401, attempt a refresh once, then replay the
// original request with the new token.
api.interceptors.response.use(
  (r) => r,
  async (error: AxiosError) => {
    const original = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
    // Only retry once (_retry flag) and never for /auth/* endpoints — a 401
    // on login/register/refresh means "bad creds", not "token expired".
    if (error.response?.status === 401 && !original._retry && !original.url?.includes('/auth/')) {
      original._retry = true;
      if (!refreshInFlight) {
        refreshInFlight = refreshAccessToken().finally(() => {
          refreshInFlight = null;
        });
      }
      const newToken = await refreshInFlight;
      if (newToken) {
        original.headers.Authorization = `Bearer ${newToken}`;
        return api(original);
      }
      // Hard redirect so all in-memory state (React Query cache, etc.) resets.
      window.location.href = '/login';
    }
    return Promise.reject(error);
  },
);
