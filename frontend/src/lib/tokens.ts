// Thin wrapper around localStorage for JWT storage.
//
// Why localStorage vs httpOnly cookies: localStorage is readable by JS, which
// is vulnerable to XSS but simpler with a SPA + JSON API. Cookies would need
// CSRF protection and same-origin setup. For this app localStorage is fine;
// swap this file if you later need stricter security.
const ACCESS_KEY = 'em_access_token';
const REFRESH_KEY = 'em_refresh_token';

export const tokenStore = {
  getAccess: () => localStorage.getItem(ACCESS_KEY),
  getRefresh: () => localStorage.getItem(REFRESH_KEY),
  set: (access: string, refresh: string) => {
    localStorage.setItem(ACCESS_KEY, access);
    localStorage.setItem(REFRESH_KEY, refresh);
  },
  clear: () => {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
  },
};
