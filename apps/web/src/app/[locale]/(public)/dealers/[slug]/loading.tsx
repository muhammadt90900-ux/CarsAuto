// apps/web/src/app/[locale]/(public)/dealers/[slug]/loading.tsx
export default function DealerShowroomLoading() {
  return (
    <div className="max-w-6xl mx-auto px-4 py-8" aria-busy="true" aria-label="Loading dealer">
      <div className="h-40 skeleton rounded-2xl mb-6" />
      <div className="flex items-center gap-4 mb-8">
        <div className="h-20 w-20 skeleton rounded-full" />
        <div className="space-y-2 flex-1">
          <div className="h-6 skeleton rounded-lg w-1/3" />
          <div className="h-4 skeleton rounded-lg w-1/4" />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-52 skeleton rounded-2xl" />
        ))}
      </div>
    </div>
  );
}
