// apps/web/src/hooks/useFavorites.ts
// Previously missing entirely: ListingCard's heart button had the UI and an
// `onToggleSave` callback prop, but nothing in the app ever called
// usersApi.addFavorite/removeFavorite, so "saving" a listing never
// persisted — it just flipped a local boolean that reset on refresh. This
// hook is the real implementation, mirroring the useDealerFollow pattern.
'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Listing } from '@cars-auto/types';
import { usersApi } from '@/lib/api';
import { queryKeys } from '@/lib/queryKeys';
import { useAuthStore } from '@/store/auth.store';

/**
 * Fetches the current user's saved/favorited listings.
 * Use on dashboard/favorites (Saved Listings tab).
 * Disabled automatically when signed out.
 */
export function useFavorites() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  return useQuery({
    queryKey: queryKeys.favorites.all(),
    queryFn: async () => {
      const res = await usersApi.getFavorites();
      return res.data;
    },
    enabled: isAuthenticated,
    staleTime: 30_000,
  });
}

/**
 * Hook for toggling a single listing's saved state with an optimistic
 * update against the shared favorites cache, so the heart button, the
 * favorites dashboard list, and any other listing card referencing the
 * same listing all stay in sync immediately.
 *
 * Use this for the `onToggleSave` prop on <ListingCard /> and for any
 * bespoke card that renders its own heart button.
 */
export function useToggleFavorite() {
  const queryClient = useQueryClient();
  const queryKey = queryKeys.favorites.all();

  const addMutation = useMutation({
    mutationFn: (listingId: string) => usersApi.addFavorite(listingId),
    onError: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  const removeMutation = useMutation({
    mutationFn: (listingId: string) => usersApi.removeFavorite(listingId),
    onError: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  const toggle = async (listing: Listing, nextSaved: boolean) => {
    await queryClient.cancelQueries({ queryKey });
    const previous = queryClient.getQueryData<Listing[]>(queryKey);

    queryClient.setQueryData<Listing[]>(queryKey, (current) => {
      const list = current ?? [];
      if (nextSaved) {
        if (list.some((l) => l.id === listing.id)) return list;
        return [listing, ...list];
      }
      return list.filter((l) => l.id !== listing.id);
    });

    try {
      if (nextSaved) await addMutation.mutateAsync(listing.id);
      else await removeMutation.mutateAsync(listing.id);
    } catch {
      // Roll back on failure — the mutation's onError also invalidates,
      // but we restore synchronously here to avoid a visible flash back
      // to the wrong state before refetch completes.
      queryClient.setQueryData(queryKey, previous);
    }
  };

  return { toggle, isPending: addMutation.isPending || removeMutation.isPending };
}

/**
 * Convenience helper for card components that only need a boolean —
 * checks the shared favorites cache for a given listing id without
 * triggering its own fetch.
 */
export function useIsFavorited(listingId: string): boolean {
  const { data } = useFavorites();
  return Boolean(data?.some((l) => l.id === listingId));
}
