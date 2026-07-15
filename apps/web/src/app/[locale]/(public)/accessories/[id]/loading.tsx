// app/[locale]/(public)/accessories/[id]/loading.tsx
import { Skeleton } from '@/components/ui/Skeleton';

export default function AccessoriesDetailLoading() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8" aria-busy="true" aria-label="Loading listing">
      <Skeleton height="1.25rem" width="16rem" className="mb-6" />
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_380px] gap-8 xl:gap-10">
        <div className="space-y-4">
          <Skeleton height="24rem" className="rounded-2xl" />
          <div className="grid grid-cols-5 gap-2">
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} height="5rem" className="rounded-xl" />)}
          </div>
        </div>
        <div className="space-y-4">
          <Skeleton height="2rem" width="80%" />
          <Skeleton height="2.5rem" width="50%" />
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} height="1rem" />)}
          </div>
          <Skeleton height="3rem" className="rounded-xl mt-6" />
        </div>
      </div>
    </div>
  );
}
