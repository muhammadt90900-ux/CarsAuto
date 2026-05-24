// apps/web/src/app/[locale]/(public)/cars/[id]/page.tsx
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';

async function getListing(id: string) {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/listings/${id}`,
      { next: { revalidate: 60 } },
    );
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export default async function CarDetailPage({
  params,
}: {
  params: { id: string; locale: string };
}) {
  const listing = await getListing(params.id);
  if (!listing) notFound();

  const t      = await getTranslations('listing');
  const locale = params.locale as 'ku' | 'ar' | 'en' | 'zh';
  const cap    = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
  const title  = listing[`title${cap(locale)}`] ?? listing.titleEn;
  const desc   = listing[`description${cap(locale)}`] ?? listing.descriptionEn;
  const cover  = listing.images?.find((i: any) => i.isCover)?.url ?? listing.images?.[0]?.url;
  const make   = listing.carMake?.nameEn ?? '';
  const model  = listing.carModel?.name  ?? '';

  const specs = [
    { label: 'Brand',        value: make },
    { label: 'Model',        value: model },
    { label: 'Year',         value: listing.year },
    { label: 'Trim',         value: listing.trim },
    { label: 'Body Type',    value: listing.bodyType },
    { label: 'Fuel Type',    value: listing.fuelType },
    { label: 'Transmission', value: listing.transmission },
    { label: 'Drivetrain',   value: listing.driveType },
    { label: 'Condition',    value: listing.condition },
    { label: 'Mileage',      value: listing.mileage     ? `${listing.mileage.toLocaleString()} km`  : null },
    { label: 'Engine',       value: listing.engineSize  ? `${listing.engineSize}L`                  : null },
    { label: 'Color',        value: listing.color },
    { label: 'Doors',        value: listing.doors },
    { label: 'Seats',        value: listing.seats },
  ].filter((s) => s.value != null && s.value !== '');

  return (
    <div className="max-w-5xl mx-auto px-4 py-10 space-y-8">

      {/* ── Image gallery ─────────────────────────────────────────────────── */}
      {listing.images?.length > 0 && (
        <div className="space-y-3">
          <div className="w-full aspect-video rounded-2xl overflow-hidden bg-gray-100 dark:bg-gray-800">
            <img src={cover} alt={title} className="w-full h-full object-cover" />
          </div>
          {listing.images.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {listing.images.slice(0, 6).map((img: any) => (
                <div key={img.id} className="flex-shrink-0 w-20 h-14 rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800">
                  <img src={img.url} alt="" className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Title, trim & price ────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div className="space-y-2">
          {listing.carMake?.logoUrl && (
            <img src={listing.carMake.logoUrl} alt={make} className="h-8 object-contain" />
          )}
          <p className="text-sm font-medium text-gray-400">{make} {model}</p>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{title}</h1>
          <div className="flex flex-wrap gap-2">
            {listing.year  && <span className="text-xs font-semibold px-3 py-1 rounded-full bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-300">{listing.year}</span>}
            {listing.trim  && <span className="text-xs font-semibold px-3 py-1 rounded-full bg-[#e94560]/10 text-[#e94560]">{listing.trim}</span>}
            {listing.condition && <span className={`text-xs font-semibold px-3 py-1 rounded-full ${listing.condition === 'NEW' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-amber-500/10 text-amber-600'}`}>{listing.condition}</span>}
          </div>
        </div>
        <div className="md:text-right">
          <p className="text-3xl font-black text-[#e94560] tracking-tight">
            {listing.price.toLocaleString()} <span className="text-base font-bold">{listing.currency}</span>
          </p>
          {listing.negotiable && <p className="text-xs text-gray-400 mt-1">Negotiable</p>}
          {listing.location   && <p className="text-xs text-gray-400 mt-1">📍 {listing.location.nameEn ?? listing.location.city}</p>}
        </div>
      </div>

      {/* ── Specs grid ────────────────────────────────────────────────────── */}
      <div>
        <h2 className="font-bold text-lg text-gray-900 dark:text-white mb-4">Specifications</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {specs.map((s) => (
            <div key={s.label} className="bg-white dark:bg-white/5 border border-gray-100 dark:border-white/5 rounded-xl p-4 text-center">
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1">{s.label}</p>
              <p className="font-semibold text-sm text-gray-900 dark:text-white">{String(s.value)}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Features ──────────────────────────────────────────────────────── */}
      {listing.features?.length > 0 && (
        <div className="bg-white dark:bg-white/5 border border-gray-100 dark:border-white/5 rounded-2xl p-6">
          <h2 className="font-bold text-lg text-gray-900 dark:text-white mb-4">Features & Options</h2>
          <div className="flex flex-wrap gap-2">
            {listing.features.map((f: string) => (
              <span key={f} className="text-sm px-3 py-1.5 rounded-full bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-300 font-medium">
                ✓ {f}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ── Description ───────────────────────────────────────────────────── */}
      {desc && (
        <div className="bg-white dark:bg-white/5 border border-gray-100 dark:border-white/5 rounded-2xl p-6">
          <h2 className="font-bold text-lg text-gray-900 dark:text-white mb-3">Description</h2>
          <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">{desc}</p>
        </div>
      )}

      {/* ── Seller info ───────────────────────────────────────────────────── */}
      {listing.user && (
        <div className="bg-white dark:bg-white/5 border border-gray-100 dark:border-white/5 rounded-2xl p-6">
          <h2 className="font-bold text-lg text-gray-900 dark:text-white mb-4">Seller</h2>
          <div className="flex items-center gap-4">
            {listing.user.avatar
              ? <img src={listing.user.avatar} alt={listing.user.name} className="w-14 h-14 rounded-full object-cover" />
              : <div className="w-14 h-14 rounded-full bg-gray-100 dark:bg-white/10 flex items-center justify-center text-2xl">👤</div>
            }
            <div className="flex-1">
              <p className="font-semibold text-gray-900 dark:text-white text-lg">{listing.user.name}</p>
              {listing.user.verified && (
                <span className="text-xs text-emerald-600 font-semibold">✓ Verified Seller</span>
              )}
            </div>
            {listing.user.phone && (
              <a
                href={`tel:${listing.user.phone}`}
                className="px-5 py-2.5 bg-[#e94560] hover:bg-[#d63d57] text-white text-sm font-bold rounded-xl transition-colors shadow-lg shadow-[#e94560]/25"
              >
                📞 Call
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
