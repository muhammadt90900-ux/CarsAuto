// apps/web/src/app/[locale]/admin/loading.tsx
//
// Generic admin content skeleton — renders inside AdminLayout (sidebar/
// header already painted). Nested routes that render tables (listings,
// users) provide their own more specific table-shaped loading.tsx.

import { Skeleton } from '@/components/ui/Skeleton';

export default function AdminLoading() {
  return (
    <div className="p-4 md:p-8 space-y-6" aria-busy="true" aria-label="Loading admin panel">
      <Skeleton height="1.75rem" width="30%" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} height="5.5rem" rounded="rounded-2xl" />
        ))}
      </div>
      <Skeleton height="16rem" rounded="rounded-2xl" />
    </div>
  );
}
