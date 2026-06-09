'use client';
// components/Providers.tsx — PERFORMANCE OPTIMISED

import { ReactNode, useEffect, lazy, Suspense } from 'react';

const ReactQueryDevtools = lazy(() =>
  import('@tanstack/react-query-devtools').then((m) => ({ default: m.ReactQueryDevtools }))
);

import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import { listingsApi, api, setAccessToken } from '@/lib/api';
import { queryKeys } from '@/lib/queryKeys';
import { useAuthStore } from '@/store/auth.store';

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
        queryFn: () => listingsApi.getById(id),
        staleTime: 2 * 60_000,
      });
    };

    document.addEventListener('mouseenter', onMouseEnter, true);
    return () => document.removeEventListener('mouseenter', onMouseEnter, true);
  }, []);
}

function usePrefetchStaticData() {
  useEffect(() => {
    queryClient.prefetchQuery({
      queryKey: queryKeys.vehicles.brands(),
      queryFn: () => import('@/lib/api').then(m => m.vehiclesApi.getBrands()),
      staleTime: 10 * 60_000,
    });
  }, []);
}

function useSessionHydration() {
  const { loadUser } = useAuthStore();

  useEffect(() => {
    // Manually rehydrate Zustand persist store — client only.
    // skipHydration: true in the store prevents localStorage reads during SSR,
    // so we trigger it here after mount to avoid server/client mismatch.
    useAuthStore.persist.rehydrate();

    const restore = async () => {
      try {
        const { data } = await api.post<{ access_token: string }>('/auth/refresh');
        if (data?.access_token) {
          setAccessToken(data.access_token);
          await loadUser();
        }
      } catch {
        // Normal for logged-out users — no action needed
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