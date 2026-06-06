// apps/web/src/lib/queryClient.ts — PERFORMANCE OPTIMISED
// Singleton TanStack Query client with aggressive caching for a marketplace.

import { QueryClient } from '@tanstack/react-query';

// PERF: Vehicle reference data (brands/models) is virtually static — 30 min stale
// PERF: Listing detail pages get 2 min; lists get 60 s
// Adjust per-query with queryFn options; these are sensible marketplace defaults.
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // PERF: 2 min default stale window — avoids redundant refetches on navigation
      staleTime: 2 * 60_000,
      // PERF: keep garbage-collected data for 10 min so Back navigation is instant
      gcTime: 10 * 60_000,
      // PERF: no refetch on window focus — listing data doesn't change per-second
      refetchOnWindowFocus: false,
      // PERF: no refetch on re-mount if data is still fresh
      refetchOnMount: false,
      // Retry once on network failure; never retry 4xx (user / auth errors)
      retry: (failureCount, error: any) => {
        const status = error?.response?.status ?? error?.status;
        if (status >= 400 && status < 500) return false;
        return failureCount < 1;
      },
      // PERF: background refetch uses old data while fetching — no blank flash
      placeholderData: (prev: unknown) => prev,
    },
    mutations: {
      // Mutations: one retry on network transient failure, never on 4xx
      retry: (failureCount, error: any) => {
        const status = error?.response?.status ?? error?.status;
        if (status >= 400 && status < 500) return false;
        return failureCount < 1;
      },
    },
  },
});
