// apps/web/src/app/[locale]/(public)/services/loading.tsx
//
// Next.js wraps page.tsx in a Suspense boundary using this as the fallback,
// shown during the server render and during client-side navigations in.
import { Skeleton, SkeletonCard } from '@/components/ui/Skeleton';

export default function ServicesLoading() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-8" aria-busy="true" aria-label="Loading services">
      <Skeleton height="2.25rem" width="12rem" className="mb-6" />
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}
      </div>
    </div>
  );
}
