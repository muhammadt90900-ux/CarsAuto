// apps/web/src/app/[locale]/admin/users/loading.tsx
//
// Route-level fallback for the admin users table.

import { Skeleton, SkeletonTableRow } from '@/components/ui/Skeleton';

export default function AdminUsersLoading() {
  return (
    <div className="p-4 md:p-8 space-y-4" aria-busy="true" aria-label="Loading users">
      <div className="flex items-center justify-between">
        <Skeleton height="1.75rem" width="25%" />
        <Skeleton height="2.5rem" width="10rem" rounded="rounded-xl" />
      </div>
      <div className="rounded-2xl border border-white/[0.06] overflow-hidden">
        <table className="w-full">
          <tbody>
            {Array.from({ length: 8 }).map((_, i) => (
              <SkeletonTableRow key={i} cols={6} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
