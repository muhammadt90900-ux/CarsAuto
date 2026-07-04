// apps/web/src/app/[locale]/(protected)/sell/loading.tsx
//
// Shown while the (protected) AuthGuard resolves and SellCarForm streams in.

import { Skeleton } from '@/components/ui/Skeleton';

export default function SellLoading() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6" aria-busy="true" aria-label="Loading">
      <Skeleton height="2rem" width="40%" />
      <div className="flex gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} height="0.5rem" className="flex-1" rounded="rounded-full" />
        ))}
      </div>
      <div className="space-y-4 pt-4">
        <Skeleton height="3rem" />
        <Skeleton height="3rem" />
        <Skeleton height="8rem" />
        <Skeleton height="3rem" width="50%" />
      </div>
    </div>
  );
}
