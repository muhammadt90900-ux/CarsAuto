// apps/web/src/app/[locale]/dashboard/dealers/inventory/loading.tsx

import { Skeleton } from '@/components/ui/Skeleton';

export default function InventoryLoading() {
  return (
    <div className="p-6 space-y-6 max-w-6xl" aria-busy="true" aria-label="Loading inventory">
      <div className="flex items-center justify-between">
        <Skeleton height="2rem" width="10rem" />
        <Skeleton height="2.5rem" width="8rem" className="rounded-xl" />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} height="4.5rem" className="rounded-2xl" />
        ))}
      </div>
      <div className="space-y-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} height="4rem" className="rounded-2xl" />
        ))}
      </div>
    </div>
  );
}
