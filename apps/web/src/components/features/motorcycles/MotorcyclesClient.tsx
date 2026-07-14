'use client';
// components/features/motorcycles/MotorcyclesClient.tsx
//
// PROMPT 3 — mirrors CarsMarketplaceClient.tsx's overall shell (sidebar
// filters, grid/list toggle, pagination, memoised card) since motorcycles
// share the exact same backend model as cars — `ListingVehicleSpec` — with
// bodyType/fuelType/transmission/drivetrain/doors/seats simply left null.
// See PROMPT 3 report for the full reasoning on why this was adapted
// (Cars-style) rather than following SparePartsClient's simpler shell.
//
// Filter design note: only filters the `/listings` endpoint actually
// supports are wired to the API (see ListingQueryDto in
// apps/api/.../listings.controller.ts): brandId/modelId, minYear/maxYear,
// minPrice/maxPrice, condition, color, minMileage/maxMileage, search.
// City is filtered CLIENT-SIDE against the already-fetched page's
// `location.city` (there's no /locations list endpoint to source real
// options from, and no server-side `city` query param — see report).
// Engine CC is NOT filterable or displayable on this grid: the list
// endpoint's Prisma `select` (listings.service.ts LIST_SELECT, ~line 104)
// doesn't include `vehicleSpec.engineCC` — only the single-listing detail
// endpoint does. That's a small backend gap, flagged in the report rather
// than silently working around it.
//
// Brand/model use the REAL cascading API (vehiclesApi.getBrands /
// getModels) — unlike CarsMarketplaceClient's hardcoded MAKES string array
// (which sends a `make` param the backend DTO doesn't even recognize, so
// it's currently a silent no-op there). This version sends real
// `brandId`/`modelId` UUIDs, which the DTO does accept.

import { useState, useCallback, useMemo, memo, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, usePathname } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import {
  Search, SlidersHorizontal, X, Grid3X3, List,
  MapPin, Gauge, Heart, ChevronDown, ChevronUp,
  Shield, Filter, Bike, Navigation,
} from 'lucide-react';
import { listingsApi, vehiclesApi } from '@/lib/api';
import { queryKeys } from '@/lib/queryKeys';
import { SkeletonCard } from '@/components/ui/Skeleton';
import { useIsFavorited, useToggleFavorite } from '@/hooks/useFavorites';
import type { Listing } from '@cars-auto/types';

// Search Architecture Phase 3: small helper so a facet count can be
// rendered next to a filter option without every render site repeating
// the same "find this value in the facet array" lookup.
function facetCount(facets: Record<string, { value: string; count: number }[]> | undefined, field: string, value: string): number | null {
  const entry = facets?.[field]?.find(f => f.value === value);
  return entry ? entry.count : null;
}

const CONDITIONS = ['NEW', 'USED', 'SALVAGE'];
const COLORS = ['White', 'Black', 'Silver', 'Grey', 'Red', 'Blue', 'Green', 'Gold', 'Brown'];
const YEARS = Array.from({ length: 26 }, (_, i) => 2025 - i);
const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest First' },
  { value: 'price_asc', label: 'Price: Low → High' },
  { value: 'price_desc', label: 'Price: High → Low' },
  { value: 'mileage', label: 'Lowest Mileage' },
];

const fmtPrice = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
const fmtNum = new Intl.NumberFormat('en-US');

/* ── Motorcycle Card — memoised, uses the REAL nested vehicleSpec shape
   returned by /listings (unlike CarCard's flat car.mileage/car.fuelType,
   which is a pre-existing mismatch there — see PROMPT 3 report) ────────── */
const MotoCard = memo(function MotoCard({
  listing,
  view,
  priority = false,
}: {
  listing: any;
  view: 'grid' | 'list';
  priority?: boolean;
}) {
  // Previously a purely local `useState(false)` toggle with no backend
  // call — see the same fix in CarsMarketplaceClient's CarCard.
  const isSaved = useIsFavorited(listing.id);
  const { toggle } = useToggleFavorite();
  const [imgError, setImgError] = useState(false);
  const spec = listing.vehicleSpec ?? {};
  const title = listing.titleEn ?? listing.title?.en ?? '';
  const cover = listing.images?.[0]?.url;

  const toggleLike = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    toggle(listing as Listing, !isSaved);
  }, [listing, isSaved, toggle]);

  const metaChips = (
    <>
      {spec.mileageKm != null && (
        <span className="flex items-center gap-1"><Gauge className="w-3 h-3" />{fmtNum.format(spec.mileageKm)} km</span>
      )}
      {spec.brand?.nameEn && <span>{spec.brand.nameEn}</span>}
      {listing.location?.city && (
        <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{listing.location.city}</span>
      )}
    </>
  );

  if (view === 'list') {
    return (
      <Link href={`/motorcycles/${listing.id}`} prefetch={false} className="block group">
        <article className="card-premium flex gap-3 sm:gap-4 p-3 sm:p-4 hover:shadow-[0_20px_60px_rgba(0,0,0,0.25)]">
          <div className="relative flex-shrink-0 rounded-xl overflow-hidden bg-slate-100 dark:bg-[var(--ink-700)]"
               style={{ width: 'clamp(96px, 25vw, 160px)', height: 'clamp(72px, 18vw, 112px)' }}>
            {!imgError && cover ? (
              <Image src={cover} alt={title} fill sizes="160px" priority={priority}
                     className="object-cover group-hover:scale-105 transition-transform duration-500"
                     onError={() => setImgError(true)} />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-4xl">🏍️</div>
            )}
            {spec.condition === 'NEW' && <span className="absolute top-2 left-2 badge badge-green">New</span>}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-bold text-base text-[var(--text-primary)] leading-tight line-clamp-1">{title}</h3>
              <p className="price-tag text-xl flex-shrink-0">{fmtPrice.format(listing.price ?? 0)}</p>
            </div>
            <div className="flex flex-wrap gap-3 mt-2 text-xs text-[var(--text-muted)]">
              {metaChips}
              {listing.user?.verified && <span className="verified-badge"><Shield className="w-2.5 h-2.5" />Verified</span>}
            </div>
          </div>
          <button onClick={toggleLike}
                  aria-label={isSaved ? 'Remove from saved' : 'Save listing'}
                  aria-pressed={isSaved}
                  className="flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center
                             bg-[var(--surface-100)] hover:bg-red-50 dark:bg-white/[0.06] dark:hover:bg-red-900/20
                             transition-colors self-center">
            <Heart className={`w-4 h-4 ${isSaved ? 'fill-red-500 text-red-500' : 'text-[var(--text-faint)]'}`} />
          </button>
        </article>
      </Link>
    );
  }

  return (
    <Link href={`/motorcycles/${listing.id}`} prefetch={false} className="block group">
      <article className="card-premium overflow-hidden h-full flex flex-col">
        <div className="relative overflow-hidden aspect-[16/10] bg-slate-100 dark:bg-[var(--ink-700)]">
          {!imgError && cover ? (
            <Image src={cover} alt={title} fill sizes="(max-width:768px) 50vw, 25vw" priority={priority}
                   className="object-cover group-hover:scale-105 transition-transform duration-500"
                   onError={() => setImgError(true)} />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-6xl">🏍️</div>
          )}
          {spec.condition === 'NEW' && <span className="absolute top-2 left-2 badge badge-green">New</span>}
          <button onClick={toggleLike}
                  aria-label={isSaved ? 'Remove from saved' : 'Save listing'}
                  aria-pressed={isSaved}
                  className="absolute top-2 right-2 w-8 h-8 rounded-full flex items-center justify-center
                             bg-black/30 backdrop-blur-sm hover:bg-black/50 transition-colors">
            <Heart className={`w-4 h-4 ${isSaved ? 'fill-red-500 text-red-500' : 'text-white'}`} />
          </button>
        </div>
        <div className="p-4 flex flex-col flex-1">
          <h3 className="font-semibold text-sm text-[var(--text-primary)] line-clamp-2 mb-2 leading-snug">{title}</h3>
          <div className="flex flex-wrap gap-3 text-xs text-[var(--text-muted)] mb-auto">{metaChips}</div>
          <div className="pt-3 mt-3 border-t border-[var(--border-subtle)] flex items-center justify-between">
            <span className="price-tag text-lg">{fmtPrice.format(listing.price ?? 0)}</span>
            {listing.user?.verified && <span className="verified-badge"><Shield className="w-2.5 h-2.5" />Verified</span>}
          </div>
        </div>
      </article>
    </Link>
  );
});

function FilterSection({ title, children, defaultOpen = true }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-[var(--border-subtle)] pb-4 mb-4">
      <button onClick={() => setOpen((v) => !v)} className="flex items-center justify-between w-full text-sm font-bold text-[var(--text-primary)] mb-3">
        {title}
        {open ? <ChevronUp className="w-4 h-4 text-[var(--text-muted)]" /> : <ChevronDown className="w-4 h-4 text-[var(--text-muted)]" />}
      </button>
      <div className={`overflow-hidden transition-all duration-300 ${open ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}>{children}</div>
    </div>
  );
}

export function MotorcyclesClient({
  locale,
  initialSearch,
  initialData,
}: {
  locale: string;
  initialSearch: Record<string, string>;
  initialData?: any;
}) {
  const [query, setQuery] = useState(initialSearch.search ?? '');
  const [brandId, setBrandId] = useState(initialSearch.brandId ?? '');
  const [modelId, setModelId] = useState(initialSearch.modelId ?? '');
  const [minYear, setMinYear] = useState(initialSearch.minYear ?? '');
  const [maxYear, setMaxYear] = useState(initialSearch.maxYear ?? '');
  const [minPrice, setMinPrice] = useState(initialSearch.minPrice ?? '');
  const [maxPrice, setMaxPrice] = useState(initialSearch.maxPrice ?? '');
  const [condition, setCondition] = useState(initialSearch.condition ?? '');
  const [color, setColor] = useState(initialSearch.color ?? '');
  const [city, setCity] = useState(''); // client-side only — see file header
  const [sort, setSort] = useState('newest');
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [page, setPage] = useState(1);

  // Search Architecture Phase 3: "near me" — requests browser geolocation
  // once, on toggle. Graceful fallback: permission denial or any
  // geolocation error just resets nearMe to false and coords to null —
  // never shows an error to the user, the geo filter section simply
  // disappears again (same UX contract the phase plan asked for).
  const [nearMe, setNearMe] = useState(false);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [radiusKm, setRadiusKm] = useState('50');

  const toggleNearMe = useCallback(() => {
    if (nearMe) {
      setNearMe(false);
      setCoords(null);
      return;
    }
    if (!('geolocation' in navigator)) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setNearMe(true);
        setPage(1);
      },
      () => {
        // Permission denied or unavailable — silently no-op, toggle stays off.
        setNearMe(false);
        setCoords(null);
      },
      { timeout: 8000 },
    );
  }, [nearMe]);

  // Search Architecture Phase 3: shareable/bookmarkable filtered URLs.
  // Mirrors initialSearch's field names exactly (page.tsx forwards
  // searchParams straight back in as initialSearch on next load).
  const router = useRouter();
  const pathname = usePathname();
  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) { isFirstRender.current = false; return; }
    const params = new URLSearchParams();
    if (query)     params.set('search', query);
    if (brandId)   params.set('brandId', brandId);
    if (modelId)   params.set('modelId', modelId);
    if (minYear)   params.set('minYear', minYear);
    if (maxYear)   params.set('maxYear', maxYear);
    if (minPrice)  params.set('minPrice', minPrice);
    if (maxPrice)  params.set('maxPrice', maxPrice);
    if (condition) params.set('condition', condition);
    if (color)     params.set('color', color);
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, brandId, modelId, minYear, maxYear, minPrice, maxPrice, condition, color]);

  const { data: brands } = useQuery({
    queryKey: queryKeys.vehicles.brands(),
    queryFn: () => vehiclesApi.getBrands(),
    staleTime: 60 * 60 * 1000,
  });
  const { data: models } = useQuery({
    queryKey: queryKeys.vehicles.models(brandId),
    queryFn: () => vehiclesApi.getModels(brandId),
    enabled: !!brandId,
    staleTime: 60 * 60 * 1000,
  });

  const selectBrand = useCallback((id: string) => {
    setBrandId((cur) => (cur === id ? '' : id));
    setModelId('');
    setPage(1);
  }, []);

  const sortByParam = sort === 'price_asc' || sort === 'price_desc' ? 'price' : sort === 'mileage' ? 'mileageKm' : 'createdAt';
  const sortOrderParam = sort === 'price_desc' ? 'desc' : sort === 'price_asc' || sort === 'mileage' ? 'asc' : 'desc';

  const queryParams = {
    type: 'MOTORCYCLE',
    search: query || undefined,
    brandId: brandId || undefined,
    modelId: modelId || undefined,
    minYear: minYear || undefined,
    maxYear: maxYear || undefined,
    minPrice: minPrice || undefined,
    maxPrice: maxPrice || undefined,
    condition: condition || undefined,
    color: color || undefined,
    sortBy: sortByParam,
    sortOrder: sortOrderParam,
    page,
    limit: 24,
    // Search Architecture Phase 3 — "near me"
    ...(nearMe && coords ? { lat: coords.lat, lng: coords.lng, radiusKm } : {}),
  };

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.listings.list(queryParams),
    queryFn: () => listingsApi.getAll(queryParams),
    placeholderData: page === 1 && !city ? initialData : (prev: any) => prev,
  });

  // Search Architecture Phase 3: live facet counts for the sidebar —
  // fetched in parallel with the listing data above, never blocks or
  // affects it. Returns {} (not an error) if the search index is down,
  // in which case every facetCount() lookup below just returns null and
  // the filter options render without counts.
  const { data: facets } = useQuery({
    queryKey: queryKeys.listings.facets(queryParams),
    queryFn: () => listingsApi.getFacets(queryParams),
    placeholderData: (prev: any) => prev,
    staleTime: 30_000,
  });

  const allListings: any[] = data?.data ?? [];
  // City filter is applied client-side (see file header) — against whatever
  // page of results the server already returned.
  const listings = city ? allListings.filter((l) => l.location?.city === city) : allListings;
  const totalPages = data && 'totalPages' in data ? data.totalPages : 1;

  const cityOptions = useMemo(
    () => Array.from(new Set(allListings.map((l) => l.location?.city).filter(Boolean))) as string[],
    [allListings],
  );

  const activeCount = [brandId, modelId, minYear, maxYear, minPrice, maxPrice, condition, color, city].filter(Boolean).length + (nearMe ? 1 : 0);

  const resetAll = useCallback(() => {
    setBrandId(''); setModelId(''); setMinYear(''); setMaxYear('');
    setMinPrice(''); setMaxPrice(''); setCondition(''); setColor(''); setCity('');
    setNearMe(false); setCoords(null);
    setPage(1);
  }, []);

  const SidebarContent = () => (
    <div className="text-sm">
      <div className="relative mb-5">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--text-muted)]" />
        <input value={query} onChange={(e) => { setQuery(e.target.value); setPage(1); }}
               placeholder="Search motorcycles…" className="input-base pl-9 h-10" />
      </div>

      <FilterSection title="Brand">
        <div className="space-y-1.5 max-h-56 overflow-y-auto no-scrollbar">
          {(brands ?? []).map((b: any) => {
            const count = facetCount(facets, 'brandId', b.id);
            return (
              <label key={b.id} className="flex items-center gap-2.5 cursor-pointer group">
                <input type="radio" name="brand" checked={brandId === b.id} onChange={() => selectBrand(b.id)} className="w-4 h-4 accent-[var(--gold)]" />
                <span className="text-[var(--text-secondary)] group-hover:text-[var(--gold)] transition-colors flex-1">{b.name?.en ?? b.name}</span>
                {count != null && <span className="text-[10px] text-[var(--text-muted)]">({count})</span>}
              </label>
            );
          })}
        </div>
      </FilterSection>

      {brandId && (
        <FilterSection title="Model">
          <div className="space-y-1.5 max-h-56 overflow-y-auto no-scrollbar">
            {(models ?? []).map((m: any) => (
              <label key={m.id} className="flex items-center gap-2.5 cursor-pointer group">
                <input type="radio" name="model" checked={modelId === m.id} onChange={() => { setModelId((cur) => (cur === m.id ? '' : m.id)); setPage(1); }} className="w-4 h-4 accent-[var(--gold)]" />
                <span className="text-[var(--text-secondary)] group-hover:text-[var(--gold)] transition-colors">{m.name}</span>
              </label>
            ))}
            {models && models.length === 0 && <p className="text-xs text-[var(--text-muted)]">No models found for this brand.</p>}
          </div>
        </FilterSection>
      )}

      <FilterSection title="Year">
        <div className="flex gap-2">
          <select value={minYear} onChange={(e) => { setMinYear(e.target.value); setPage(1); }} className="input-base h-9 text-xs">
            <option value="">Min</option>
            {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
          <select value={maxYear} onChange={(e) => { setMaxYear(e.target.value); setPage(1); }} className="input-base h-9 text-xs">
            <option value="">Max</option>
            {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </FilterSection>

      <FilterSection title="Price (USD)">
        <div className="flex gap-2">
          <input type="number" placeholder="Min" value={minPrice} onChange={(e) => { setMinPrice(e.target.value); setPage(1); }} className="input-base h-9 text-xs" />
          <input type="number" placeholder="Max" value={maxPrice} onChange={(e) => { setMaxPrice(e.target.value); setPage(1); }} className="input-base h-9 text-xs" />
        </div>
      </FilterSection>

      <FilterSection title="Condition">
        <div className="space-y-1.5">
          {CONDITIONS.map((c) => {
            const count = facetCount(facets, 'condition', c);
            return (
              <label key={c} className="flex items-center gap-2.5 cursor-pointer group">
                <input type="radio" name="condition" checked={condition === c} onChange={() => { setCondition((cur) => (cur === c ? '' : c)); setPage(1); }} className="w-4 h-4 accent-[var(--gold)]" />
                <span className="text-[var(--text-secondary)] group-hover:text-[var(--gold)] transition-colors capitalize flex-1">{c.toLowerCase()}</span>
                {count != null && <span className="text-[10px] text-[var(--text-muted)]">({count})</span>}
              </label>
            );
          })}
        </div>
      </FilterSection>

      <FilterSection title="Near Me">
        <button
          type="button"
          onClick={toggleNearMe}
          className={`w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold border transition-colors
            ${nearMe ? 'bg-[var(--gold-subtle)] border-[var(--border-gold)] text-[var(--gold)]' : 'border-[var(--border-default)] text-[var(--text-secondary)] hover:border-[var(--border-gold)]'}`}
        >
          <Navigation className="w-3.5 h-3.5" />
          {nearMe ? `Within ${radiusKm} km of you` : 'Search near me'}
        </button>
        {nearMe && (
          <select
            value={radiusKm}
            onChange={(e) => { setRadiusKm(e.target.value); setPage(1); }}
            className="input-base h-9 text-xs mt-2 w-full"
          >
            {['10', '25', '50', '100', '250'].map((r) => <option key={r} value={r}>{r} km</option>)}
          </select>
        )}
      </FilterSection>

      <FilterSection title="Color">
        <div className="flex flex-wrap gap-2">
          {COLORS.map((c) => (
            <button key={c} onClick={() => { setColor((cur) => (cur === c ? '' : c)); setPage(1); }}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors
                      ${color === c ? 'bg-[var(--gold-subtle)] border-[var(--border-gold)] text-[var(--gold)]' : 'border-[var(--border-default)] text-[var(--text-secondary)] hover:border-[var(--border-gold)]'}`}>
              {c}
            </button>
          ))}
        </div>
      </FilterSection>

      {cityOptions.length > 0 && (
        <FilterSection title="City">
          <div className="space-y-1.5">
            {cityOptions.map((c) => (
              <label key={c} className="flex items-center gap-2.5 cursor-pointer group">
                <input type="radio" name="city" checked={city === c} onChange={() => setCity((cur) => (cur === c ? '' : c))} className="w-4 h-4 accent-[var(--gold)]" />
                <span className="text-[var(--text-secondary)] group-hover:text-[var(--gold)] transition-colors">{c}</span>
              </label>
            ))}
          </div>
        </FilterSection>
      )}

      {activeCount > 0 && (
        <button onClick={resetAll} className="w-full mt-2 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-red-500 border border-red-200 dark:border-red-900/30 hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors">
          <X className="w-4 h-4" />Clear All
        </button>
      )}
    </div>
  );

  const isRtl = locale === 'ku' || locale === 'ar';

  return (
    <div dir={isRtl ? 'rtl' : 'ltr'} className="min-h-screen bg-[var(--surface-0)] dark:bg-[var(--ink-900)]">
      <div className="relative overflow-hidden border-b border-[var(--border-default)]" style={{ background: 'linear-gradient(135deg, var(--ink-900) 0%, var(--ink-750) 60%, var(--ink-900) 100%)' }}>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <nav className="flex items-center gap-2 text-xs text-white/40 mb-4">
            <Link href="/" className="hover:text-[var(--gold)] transition-colors">Home</Link>
            <span>/</span><span className="text-white/60">Motorcycles</span>
          </nav>
          <h1 className="text-3xl sm:text-4xl font-display font-black text-white mb-2 flex items-center gap-3">
            <Bike className="w-8 h-8 text-[var(--gold)]" />Motorcycles
          </h1>
          <p className="text-white/45 text-sm">{listings.length}+ listings from verified sellers</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex gap-8">
          <aside className="hidden lg:block w-64 flex-shrink-0">
            <div className="sticky top-[calc(var(--navbar-h)+1.5rem)] rounded-2xl bg-white dark:bg-[var(--ink-750)] border border-[var(--border-default)] shadow-[var(--shadow-sm)] p-5 max-h-[calc(100vh-120px)] overflow-y-auto no-scrollbar">
              <h2 className="font-bold text-[var(--text-primary)] flex items-center gap-2 mb-5">
                <Filter className="w-4 h-4 text-[var(--gold)]" />Filters
                {activeCount > 0 && <span className="badge badge-gold">{activeCount}</span>}
              </h2>
              <SidebarContent />
            </div>
          </aside>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
              <div className="flex items-center gap-3">
                <button onClick={() => setSidebarOpen(true)}
                        className="lg:hidden flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-white dark:bg-[var(--ink-750)] border border-[var(--border-default)] shadow-[var(--shadow-sm)] text-[var(--text-secondary)] hover:border-[var(--border-gold)]">
                  <SlidersHorizontal className="w-4 h-4" />Filters
                  {activeCount > 0 && <span className="badge badge-gold">{activeCount}</span>}
                </button>
                <p className="text-sm text-[var(--text-muted)] hidden sm:block"><strong className="text-[var(--text-primary)]">{listings.length}</strong> results</p>
              </div>
              <div className="flex items-center gap-2">
                <select value={sort} onChange={(e) => { setSort(e.target.value); setPage(1); }} className="input-base h-9 text-xs w-44">
                  {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
                <div className="flex rounded-xl overflow-hidden border border-[var(--border-default)] bg-white dark:bg-[var(--ink-750)]">
                  {(['grid', 'list'] as const).map((v) => (
                    <button key={v} onClick={() => setView(v)}
                      aria-label={v === 'grid' ? 'Grid view' : 'List view'} aria-pressed={view === v}
                      className={`p-2 transition-colors ${view === v ? 'bg-[var(--gold-subtle)] text-[var(--gold)]' : 'text-[var(--text-muted)] hover:text-[var(--gold)]'}`}>
                      {v === 'grid' ? <Grid3X3 className="w-4 h-4" /> : <List className="w-4 h-4" />}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {isLoading ? (
              <div className={view === 'grid' ? 'grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4' : 'flex flex-col gap-3'}>
                {Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}
              </div>
            ) : (
              <div className={view === 'grid' ? 'grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4' : 'flex flex-col gap-3'}>
                {listings.length === 0 ? (
                  <div className="col-span-full py-20 text-center">
                    <div className="text-5xl mb-4">🏍️</div>
                    <p className="text-[var(--text-muted)] text-sm">No motorcycles found. Try different filters.</p>
                  </div>
                ) : (
                  listings.map((listing, i) => <MotoCard key={listing.id} listing={listing} view={view} priority={i < 4} />)
                )}
              </div>
            )}

            {totalPages > 1 && !city && (
              <div className="flex justify-center gap-2 mt-10">
                {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => i + 1).map((p) => (
                  <button key={p} onClick={() => setPage(p)}
                          className={`w-9 h-9 rounded-xl text-sm font-semibold transition-all
                            ${p === page ? 'text-[var(--ink-900)] shadow-[0_2px_8px_rgba(201,168,76,0.35)]' : 'bg-white dark:bg-[var(--ink-750)] border border-[var(--border-default)] text-[var(--text-muted)] hover:border-[var(--border-gold)] hover:text-[var(--gold)]'}`}
                          style={p === page ? { background: 'linear-gradient(135deg, #a87828 0%, var(--gold) 50%, #dab445 100%)' } : undefined}>
                    {p}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {sidebarOpen && (
        <>
          <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden" onClick={() => setSidebarOpen(false)} />
          <div className="fixed inset-y-0 left-0 z-50 w-80 bg-white dark:bg-[var(--ink-750)] shadow-[var(--shadow-xl)] overflow-y-auto no-scrollbar lg:hidden">
            <div className="flex items-center justify-between p-5 border-b border-[var(--border-default)]">
              <h2 className="font-bold text-[var(--text-primary)]">Filters</h2>
              <button onClick={() => setSidebarOpen(false)} aria-label="Close filters" className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[var(--surface-100)]"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-5"><SidebarContent /></div>
          </div>
        </>
      )}
    </div>
  );
}
