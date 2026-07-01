// apps/web/src/app/[locale]/(public)/dealers/loading.tsx
export default function DealersLoading() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-8" aria-busy="true" aria-label="Loading dealers">
      <div className="h-9 w-48 skeleton rounded-lg mb-6" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i}
            className="rounded-2xl overflow-hidden bg-white dark:bg-gradient-to-b dark:from-[#0d1e35] dark:to-[#0a1528]
                       border border-slate-100 dark:border-white/[0.05] p-5 space-y-3">
            <div className="flex items-center gap-3">
              <div className="h-14 w-14 skeleton rounded-full" />
              <div className="flex-1 space-y-2">
                <div className="h-4 skeleton rounded-lg w-3/4" />
                <div className="h-3 skeleton rounded-lg w-1/2" />
              </div>
            </div>
            <div className="h-3 skeleton rounded-lg w-full" />
            <div className="h-3 skeleton rounded-lg w-2/3" />
          </div>
        ))}
      </div>
    </div>
  );
}
