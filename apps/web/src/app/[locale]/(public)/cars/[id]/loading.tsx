// apps/web/src/app/[locale]/(public)/cars/[id]/loading.tsx
export default function CarDetailLoading() {
  return (
    <div className="max-w-6xl mx-auto px-4 py-8" aria-busy="true" aria-label="Loading listing">
      <div className="h-5 w-64 skeleton rounded-lg mb-6" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-4">
          <div className="h-96 skeleton rounded-2xl" />
          <div className="grid grid-cols-5 gap-2">
            {Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-20 skeleton rounded-xl" />)}
          </div>
        </div>
        <div className="space-y-4">
          <div className="h-8 skeleton rounded-lg w-3/4" />
          <div className="h-10 skeleton rounded-lg w-1/2" />
          <div className="h-px bg-slate-100 dark:bg-white/[0.05]" />
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-4 skeleton rounded-lg" />)}
          </div>
          <div className="h-12 skeleton rounded-xl mt-6" />
        </div>
      </div>
    </div>
  );
}

