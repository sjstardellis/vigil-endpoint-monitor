// React Query configuration. Reused across the whole app.
//
// React Query handles server-state caching: instead of `useState + useEffect
// + fetch` everywhere, you call `useQuery` and it dedupes, caches, and
// re-fetches for you.
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // One retry on failure (the default is 3, which feels too aggressive
      // for a UI — delays error feedback).
      retry: 1,
      // Don't re-fetch when tabbing back in. Our dashboard uses a 15s poll
      // instead, which is predictable.
      refetchOnWindowFocus: false,
      // Treat data as fresh for 10s. Navigating back to a page you just
      // left won't re-fetch needlessly.
      staleTime: 10_000,
    },
  },
});
