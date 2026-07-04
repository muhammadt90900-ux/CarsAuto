// apps/web/src/app/[locale]/dashboard/loading.tsx
//
// Generic dashboard content skeleton. Renders inside DashboardLayout
// (sidebar/header/bottom-nav already painted), so this only needs to
// cover the main content area. Nested routes with a distinct shape
// (messages, listings) provide their own more specific loading.tsx.

import { Skeleton } from '@/components/ui/Skeleton';

export default function DashboardLoading() {
  return (
    <div className="p-4 md:p-8 space-y-6" aria-busy="true" aria-label="Loading dashboard">
      <Skeleton height="1.75rem" width="35%" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} height="5.5rem" rounded="rounded-2xl" />
        ))}
      </div>
      <Skeleton height="14rem" rounded="rounded-2xl" />
    </div>
  );
}
