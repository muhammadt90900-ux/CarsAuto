// apps/web/src/hooks/useDealerFollow.ts — FEATURE 9: Dealer Follower System
'use client';

import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

interface FollowResponse {
  followerCount: number;
}

interface FollowedDealer {
  followedAt: string;
  dealer: {
    id: string;
    slug: string;
    nameEn: string;
    nameAr: string;
    nameKu: string;
    logoUrl: string | null;
    coverUrl: string | null;
    tier: string;
    averageRating: number;
    totalReviews: number;
    activeListings: number;
    location: { city: string; nameKu: string; nameEn: string } | null;
    badges: Array<{ code: string; label: string; icon: string }>;
    subscription: { plan: string } | null;
    _count: { followers: number };
    listings: Array<{
      id: string;
      titleKu: string;
      titleEn: string;
      titleAr: string;
      price: string;
      currency: string;
      type: string;
      createdAt: string;
      images: Array<{ url: string }>;
    }>;
  };
}

/**
 * Hook for following/unfollowing a dealer with optimistic updates.
 * Use on dealer showroom pages (DealerShowroomClient).
 */
export function useDealerFollow(dealerId: string, initialIsFollowing = false, initialCount = 0) {
  const queryClient = useQueryClient();
  const queryKey = ['dealer-follow', dealerId];

  const followMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.post<FollowResponse>(`/dealers/${dealerId}/follow`);
      return data;
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData(queryKey);
      queryClient.setQueryData(queryKey, {
        isFollowing: true,
        followerCount: initialCount + 1,
      });
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(queryKey, context.previous);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['dealer', dealerId] });
    },
  });

  const unfollowMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.delete<FollowResponse>(`/dealers/${dealerId}/follow`);
      return data;
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData(queryKey);
      queryClient.setQueryData(queryKey, {
        isFollowing: false,
        followerCount: Math.max(0, initialCount - 1),
      });
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(queryKey, context.previous);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['dealer', dealerId] });
    },
  });

  const state = queryClient.getQueryData<{ isFollowing: boolean; followerCount: number }>(queryKey) ?? {
    isFollowing: initialIsFollowing,
    followerCount: initialCount,
  };

  const toggle = () => {
    if (state.isFollowing) unfollowMutation.mutate();
    else followMutation.mutate();
  };

  return {
    isFollowing: state.isFollowing,
    followerCount: state.followerCount,
    toggle,
    isPending: followMutation.isPending || unfollowMutation.isPending,
  };
}

/**
 * Hook for fetching the list of dealers the current user follows.
 * Use on dashboard/favorites "Followed Dealers" tab.
 */
export function useFollowedDealers() {
  return useQuery({
    queryKey: ['followed-dealers'],
    queryFn: async () => {
      const { data } = await api.get<FollowedDealer[]>('/dealers/me/following');
      return data;
    },
    staleTime: 60_000,
  });
}
