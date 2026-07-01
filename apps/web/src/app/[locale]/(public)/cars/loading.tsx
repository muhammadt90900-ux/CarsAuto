// apps/web/src/app/[locale]/(public)/cars/loading.tsx
//
// F-PERF fix: Next.js automatically wraps page.tsx in a Suspense boundary
// using this as the fallback — shown during the server-side data fetch
// (and during client-side navigations into this route).

export default function CarsLoading() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-8" aria-busy="true" aria-label="Loading cars">
      <div className="h-9 w-48 skeleton rounded-lg mb-6" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {Array.from({ length: 9 }).map((_, i) => (
          <div key={i}
            className="rounded-2xl overflow-hidden bg-white dark:bg-gradient-to-b dark:from-[#0d1e35] dark:to-[#0a1528]
                       border border-slate-100 dark:border-white/[0.05]">
            <div className="h-52 skeleton" />
            <div className="p-4 space-y-3">
              <div className="h-4 skeleton rounded-lg w-3/4" />
              <div className="h-3 skeleton rounded-lg w-1/2" />
              <div className="flex items-center justify-between pt-2">
                <div className="h-6 skeleton rounded-lg w-2/5" />
                <div className="h-8 w-8 skeleton rounded-full" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
