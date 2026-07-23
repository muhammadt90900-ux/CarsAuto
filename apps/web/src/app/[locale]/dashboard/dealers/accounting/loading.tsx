// apps/web/src/app/[locale]/dashboard/dealers/accounting/loading.tsx

import { Skeleton } from '@/components/ui/Skeleton';

export default function AccountingLoading() {
  return (
    <div className="p-6 space-y-6 max-w-6xl" aria-busy="true" aria-label="Loading accounting">
      <Skeleton height="2rem" width="10rem" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} height="5rem" className="rounded-2xl" />
        ))}
      </div>
      <Skeleton height="10rem" className="rounded-2xl" />
    </div>
  );
}
