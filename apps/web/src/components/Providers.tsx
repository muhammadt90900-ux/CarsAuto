'use client';
// apps/web/src/components/Providers.tsx

import { ReactNode, useEffect, lazy, Suspense } from 'react';

const ReactQueryDevtools = lazy(() =>
  import('@tanstack/react-query-devtools').then((m) => ({ default: m.ReactQueryDevtools }))
);

import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import { listingsApi, api, setAccessToken } from '@/lib/api';
import { queryKeys } from '@/lib/queryKeys';
import { useAuthStore } from '@/store/auth.store';

// ── Prefetch on hover ─────────────────────────────────────────────────────────

function usePrefetchOnHover() {
  useEffect(() => {
    const onMouseEnter = (e: MouseEvent) => {
      if (!(e.target instanceof Element)) return;
      const el = e.target.closest('[data-prefetch-listing]');
      if (!el) return;
      const id = (el as HTMLElement).dataset.prefetchListing;
      if (!id) return;

      queryClient.prefetchQuery({
        queryKey: queryKeys.listings.detail(id),
        queryFn:  () => listingsApi.getById(id),
        staleTime: 2 * 60_000,
      });
    };

    document.addEventListener('mouseenter', onMouseEnter, true);
    return () => document.removeEventListener('mouseenter', onMouseEnter, true);
  }, []);
}

// ── Prefetch static data ──────────────────────────────────────────────────────

function usePrefetchStaticData() {
  useEffect(() => {
    queryClient.prefetchQuery({
      queryKey: queryKeys.vehicles.brands(),
      queryFn:  () => import('@/lib/api').then(m => m.vehiclesApi.getBrands()),
      staleTime: 10 * 60_000,
    });
  }, []);
}

// ── Session hydration ─────────────────────────────────────────────────────────
//
// Sequential flow — each step waits for the previous:
//
//   1. await rehydrate()        → reads user profile from localStorage (no isHydrated yet)
//   2. await POST /auth/refresh → gets a fresh access token from the HttpOnly cookie
//   3. setAccessToken()         → puts token in memory for axios interceptor
//   4. await loadUser()         → fetches /auth/me + sets isHydrated:true
//
// AuthGuard checks isHydrated before making any routing decision.
// isHydrated is only set to true inside loadUser() — AFTER the token is in memory.
// This prevents the race condition where AuthGuard redirects to /login
// while the refresh request is still in flight.

function useSessionHydration() {
  const { loadUser } = useAuthStore();

  useEffect(() => {
    const init = async () => {
      // Step 1: Rehydrate Zustand persist store from localStorage (client only).
      // skipHydration:true in the store prevents this during SSR.
      // onRehydrateStorage is intentionally empty — it does NOT set isHydrated.
      await useAuthStore.persist.rehydrate();

      // Step 2: Attempt silent token refresh.
      // The refresh_token HttpOnly cookie is sent automatically by the browser.
      // Fails with 401 for logged-out users — expected and non-fatal.
      try {
        const { data } = await api.post<{ access_token: string }>('/auth/refresh');
        if (data?.access_token) {
          setAccessToken(data.access_token);
        }
      } catch {
        // Normal for logged-out users.
        // loadUser() below will set isHydrated:true with user:null.
      }

      // Step 3: Load full user profile.
      // If no token → sets user:null + isHydrated:true → AuthGuard redirects to /login.
      // If token valid → sets user + isHydrated:true → AuthGuard renders children.
      await loadUser();
    };

    init();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

// ── Combined effects component ────────────────────────────────────────────────

function PrefetchEffects() {
  usePrefetchOnHover();
  usePrefetchStaticData();
  useSessionHydration();
  return null;
}

// ── Providers ─────────────────────────────────────────────────────────────────

export function Providers({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <PrefetchEffects />
      {children}
      {process.env.NODE_ENV === 'development' && (
        <DynamicDevtools />
      )}
    </QueryClientProvider>
  );
}

function DynamicDevtools() {
  return (
    <Suspense fallback={null}>
      <ReactQueryDevtools initialIsOpen={false} buttonPosition="bottom-left" />
    </Suspense>
  );
}
