'use client';
// apps/web/src/components/Providers.tsx — SESSION HYDRATION FIXED

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
// ✅ FIX #4 (High): The original code called rehydrate() and restore() concurrently
// (fire-and-forget) with no ordering guarantee. This caused a race condition where
// AuthGuard could read isHydrated=false and redirect to /login even when the user
// was already authenticated.
//
// Fixed flow (sequential — each step waits for the previous):
//   1. await rehydrate()        → reads user profile from localStorage
//   2. await POST /auth/refresh → gets a fresh access token from the cookie
//   3. setAccessToken()         → puts token in memory for axios interceptor
//   4. await loadUser()         → fetches full user from /auth/me + sets isHydrated:true
//
// AuthGuard only renders children after isHydrated=true, so the user is never
// redirected to /login while the token refresh is still in flight.

function useSessionHydration() {
  const { loadUser } = useAuthStore();

  useEffect(() => {
    const init = async () => {
      // Step 1: Rehydrate Zustand persist store from localStorage (client only).
      // skipHydration: true in the store prevents localStorage reads during SSR
      // to avoid server/client mismatch — we trigger it here after mount.
      await useAuthStore.persist.rehydrate();

      // Step 2: Attempt silent refresh to get a fresh access token.
      // The refresh_token HttpOnly cookie is sent automatically by the browser.
      // This will fail (401) for logged-out users — that is expected and non-fatal.
      try {
        const { data } = await api.post<{ access_token: string }>('/auth/refresh');
        if (data?.access_token) {
          setAccessToken(data.access_token);
        }
      } catch {
        // Normal for logged-out users — no action needed.
        // loadUser() below will set isHydrated:true with user:null.
      }

      // Step 3: Load the full user profile using whatever token we now have.
      // loadUser() checks getAccessToken() internally — if no token, it sets
      // user:null and isHydrated:true, allowing AuthGuard to redirect cleanly.
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
