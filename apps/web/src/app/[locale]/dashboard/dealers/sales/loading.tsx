// apps/web/src/app/[locale]/dashboard/dealers/sales/loading.tsx

import { Skeleton } from '@/components/ui/Skeleton';

export default function SalesLoading() {
  return (
    <div className="p-6 space-y-6 max-w-6xl" aria-busy="true" aria-label="Loading sales">
      <div className="flex items-center justify-between">
        <Skeleton height="2rem" width="12rem" />
        <Skeleton height="2.5rem" width="8rem" className="rounded-xl" />
      </div>
      <div className="space-y-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} height="4.5rem" className="rounded-2xl" />
        ))}
      </div>
    </div>
  );
}
