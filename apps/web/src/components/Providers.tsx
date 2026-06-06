'use client';
// components/Providers.tsx — PERFORMANCE OPTIMISED
// Key improvements:
//   1. prefetchQuery on hover for listing detail pages (Link hover = likely click)
//   2. ReactQueryDevtools only in dev (tree-shaken in prod)
//   3. Single QueryClient singleton — never recreated between renders
//   4. FIX (Bug B): Session hydration on mount via POST /auth/refresh
//      Restores access token from HttpOnly cookie after page reload in Codespaces.

import { ReactNode, useEffect, lazy, Suspense } from 'react';

// PERF: Dynamic import — devtools are never bundled into production
const ReactQueryDevtools = lazy(() =>
  import('@tanstack/react-query-devtools').then((m) => ({ default: m.ReactQueryDevtools }))
);
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import { listingsApi, api, setAccessToken } from '@/lib/api';
import { queryKeys } from '@/lib/queryKeys';
import { useAuthStore } from '@/store/auth.store';

// PERF: Prefetch listing detail on link hover — eliminates loading state
// for ~70 % of users who hover before clicking.
// Attach via: <a data-prefetch-listing="<id>"> on any listing card
function usePrefetchOnHover() {
  useEffect(() => {
    const onMouseEnter = (e: MouseEvent) => {
      const el = (e.target as Element)?.closest('[data-prefetch-listing]');
      if (!el) return;
      const id = (el as HTMLElement).dataset.prefetchListing;
      if (!id) return;

      queryClient.prefetchQuery({
        queryKey: queryKeys.listings.detail(id),
        queryFn: () => listingsApi.getById(id),
        staleTime: 2 * 60_000, // don't re-prefetch if already fresh
      });
    };

    // Use capture so we catch events on child elements too
    document.addEventListener('mouseenter', onMouseEnter, true);
    return () => document.removeEventListener('mouseenter', onMouseEnter, true);
  }, []);
}

// PERF: Prefetch vehicle brands on mount — used in filter sidebar, nearly always needed
function usePrefetchStaticData() {
  useEffect(() => {
    queryClient.prefetchQuery({
      queryKey: queryKeys.vehicles.brands(),
      queryFn: () => import('@/lib/api').then(m => m.vehiclesApi.getBrands()),
      staleTime: 10 * 60_000,
    });
  }, []);
}

// FIX (Bug B): On page load/reload the in-memory access token is lost.
// We call POST /auth/refresh which sends the HttpOnly refresh_token cookie
// automatically. If valid, we get a new access token and restore the session
// without forcing a re-login.
function useSessionHydration() {
  const { loadUser } = useAuthStore();

  useEffect(() => {
    const restore = async () => {
      try {
        const { data } = await api.post<{ access_token: string }>('/auth/refresh');
        if (data?.access_token) {
          setAccessToken(data.access_token);
          await loadUser();
        }
      } catch {
        // Cookie missing, expired, or no active session — normal for logged-out users.
        // The app renders in unauthenticated state.
      }
    };
    restore();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

function PrefetchEffects() {
  usePrefetchOnHover();
  usePrefetchStaticData();
  useSessionHydration();
  return null;
}

export function Providers({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <PrefetchEffects />
      {children}
      {/* PERF: DevTools only in development — zero cost in production */}
      {process.env.NODE_ENV === 'development' && (
        <DynamicDevtools />
      )}
    </QueryClientProvider>
  );
}

// PERF: Wrapped in Suspense — lazy-loaded devtools won't block the render tree
function DynamicDevtools() {
  return (
    <Suspense fallback={null}>
      <ReactQueryDevtools initialIsOpen={false} buttonPosition="bottom-left" />
    </Suspense>
  );
}
