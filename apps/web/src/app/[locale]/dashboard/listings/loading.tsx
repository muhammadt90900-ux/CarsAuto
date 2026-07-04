// apps/web/src/app/[locale]/dashboard/listings/loading.tsx
//
// Route-level fallback for "My Listings" — a grid of the user's own
// listings, so a card-grid skeleton (same shape as SkeletonCard) fits best.

import { SkeletonCard, Skeleton } from '@/components/ui/Skeleton';

export default function DashboardListingsLoading() {
  return (
    <div className="p-4 md:p-8 space-y-6" aria-busy="true" aria-label="Loading listings">
      <div className="flex items-center justify-between">
        <Skeleton height="1.75rem" width="30%" />
        <Skeleton height="2.5rem" width="8rem" rounded="rounded-xl" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {Array.from({ length: 6 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    </div>
  );
}
