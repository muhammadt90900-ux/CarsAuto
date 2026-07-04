// apps/web/src/app/[locale]/(auth)/loading.tsx
//
// Fallback shown while an auth page (login/register/forgot-password/etc.)
// streams in. Shaped like a generic auth form so there's no layout shift
// once the real form mounts.

import { Skeleton } from '@/components/ui/Skeleton';

export default function AuthLoading() {
  return (
    <div className="space-y-5" aria-busy="true" aria-label="Loading">
      <Skeleton height="1.75rem" width="60%" className="mx-auto" />
      <Skeleton height="0.875rem" width="80%" className="mx-auto" />
      <div className="space-y-3 pt-4">
        <Skeleton height="2.75rem" />
        <Skeleton height="2.75rem" />
      </div>
      <Skeleton height="2.75rem" rounded="rounded-xl" />
    </div>
  );
}
