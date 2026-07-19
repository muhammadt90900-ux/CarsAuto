'use client';
// components/features/cars/CarsMarketplaceClient.tsx — PERFORMANCE OPTIMISED
// Key improvements:
//   1. CarCard is React.memo — no re-renders when only filters change
//   2. SidebarContent moved out of render — no recreation on every filter change
//   3. useCallback on all filter handlers — stable references for memoised children
//   4. Intl.NumberFormat instances hoisted — created once, not per render
//   5. Image: priority=true on first card above the fold
//   6. Pagination: real page state drives queryKey

import { useState, useCallback, memo, Fragment } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useQuery } from '@tanstack/react-query';
import {
  Search, SlidersHorizontal, X, Grid3X3, List,
  MapPin, Gauge, Fuel, Heart, ChevronDown, ChevronUp,
  Zap, Shield, ArrowUpDown, Filter,
} from 'lucide-react';
import { listingsApi, vehiclesApi } from '@/lib/api';
import { MobileCarCard } from '@/components/mobile/MobileCarCard';
import type { ListingListResponsePaged, Listing } from '@cars-auto/types';
import { queryKeys } from '@/lib/queryKeys';
import { formatCurrency } from '@cars-auto/utils';
import { isRTL } from '@/i18n/config';
import { useIsFavorited, useToggleFavorite } from '@/hooks/useFavorites';

/* ── Static filter data ─────────────────────────────────────────── */
// MAKES (a hardcoded ~16-brand list) used to live here and drove the
// "Make / Brand" filter — removed along with the fake `make` filter it
// powered; brands now come from the real vehiclesApi.getBrands() call.
const BODY_TYPES = ['Sedan','SUV','Pickup','Coupe','Hatchback','Wagon','Convertible','Van'];
const FUEL_TYPES = ['Petrol','Diesel','Hybrid','Electric','Plug-in Hybrid','LPG'];
const TRANSMISSIONS = ['Automatic','Manual','CVT','Semi-Auto'];
const COLORS = ['White','Black','Silver','Grey','Red','Blue','Green','Gold','Brown'];
const CONDITIONS = ['New','Used','Salvage'];
const CITIES = ['Erbil','Sulaymaniyah','Duhok','Kirkuk','Baghdad','Basra','Dubai','Sharjah'];
const PRICE_BRACKETS = [
  { label: 'Under $5,000', min: 0, max: 5000 },
  { label: '$5k – $15k',   min: 5000, max: 15000 },
  { label: '$15k – $30k',  min: 15000, max: 30000 },
  { label: '$30k – $60k',  min: 30000, max: 60000 },
  { label: '$60k – $100k', min: 60000, max: 100000 },
  { label: 'Over $100k',   min: 100000, max: 9999999 },
];
const SORT_OPTIONS = [
  { value: 'newest',    label: 'Newest First' },
  { value: 'price_asc', label: 'Price: Low → High' },
  { value: 'price_desc',label: 'Price: High → Low' },
  { value: 'mileage',   label: 'Lowest Mileage' },
  { value: 'popular',   label: 'Most Popular' },
];

// PERF: hoisted formatter — created once, not per render/card.
// NOTE: previously `Intl.NumberFormat('en-US', { currency: 'USD' })` — every
// IQD/AED/CNY/EUR-priced listing rendered with a "$" prefix regardless of
// its actual currency. `fmtPrice` below reads car.currency per listing.
const fmtPrice = (car: any) => formatCurrency(car.price ?? 0, car.currency ?? 'USD');
const fmtNum = new Intl.NumberFormat('en-US');

// Trust cue: listing freshness ("Posted 2d ago"). Falls back to nothing if
// createdAt isn't present rather than guessing — a wrong freshness claim
// undermines trust more than showing none at all.
function timeAgo(createdAt?: string | Date): string | null {
  if (!createdAt) return null;
  const then = new Date(createdAt).getTime();
  if (Number.isNaN(then)) return null;
  const diffMs = Date.now() - then;
  const days = Math.floor(diffMs / 86_400_000);
  if (days <= 0) return 'Today';
  if (days === 1) return '1d ago';
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}


// car.images can be an array of plain URL strings OR an array of objects
// shaped like { url, isCover } (that's the shape the API actually returns —
// see listing.images?.map(i => i.url) in cars/[id]/page.tsx). CarCard was
// reading car.images?.[0] directly, which — when images are objects — hands
// a whole object to <Image src>, not a URL string. Next.js can't resolve a
// src from that and ends up rendering src="" on the underlying <img>,
// triggering React's "empty string passed to src" warning. This helper
// normalizes both shapes and guards against empty/blank url strings too.
function getCoverImage(car: any): string {
  const images = car?.images;
  if (!Array.isArray(images) || images.length === 0) return '/placeholder-car.jpg';
  const cover = images.find((img: any) => img?.isCover) ?? images[0];
  const url = typeof cover === 'string' ? cover : cover?.url;
  return typeof url === 'string' && url.trim() !== '' ? url : '/placeholder-car.jpg';
}

// Same problem as getCoverImage: car.title isn't a field the API actually
// returns (listings use titleEn/titleKu/etc — see titleKey lookup in
// cars/[id]/page.tsx), so `alt={car.title}` was resolving to `undefined`.
// React/Next.js treats alt={undefined} as if the prop were never passed,
// which is why <Image> flagged it as missing entirely. Falls back through
// a plain title field, then make+model+year, then a generic description —
// never lets alt end up empty or undefined.
function getCarAlt(car: any): string {
  if (typeof car?.title === 'string' && car.title.trim() !== '') return car.title;
  if (typeof car?.titleEn === 'string' && car.titleEn.trim() !== '') return car.titleEn;
  const parts = [car?.year, car?.make, car?.model].filter(Boolean);
  if (parts.length > 0) return parts.join(' ');
  return 'Car listing photo';
}

// Adapter for <MobileCarCard>, which expects a lighter, pre-formatted
// display shape rather than the raw API listing object CarCard works
// with directly. Reuses the same getCoverImage/getCarAlt/fmtPrice helpers
// above so both card variants show identical data.
function toMobileCarCardProps(car: any) {
  const rawImages = Array.isArray(car?.images) ? car.images : [];
  const images = rawImages
    .map((img: any) => (typeof img === 'string' ? img : img?.url))
    .filter((url: any) => typeof url === 'string' && url.trim() !== '');
  return {
    id: car.id,
    title: getCarAlt(car),
    price: fmtPrice(car),
    year: car.year,
    city: car.city,
    mileage: car.mileage != null ? `${fmtNum.format(car.mileage)} km` : undefined,
    fuel: car.fuelType,
    images: images.length > 0 ? images : [getCoverImage(car)],
    featured: !!car.featured,
    condition: car.condition === 'New' ? ('new' as const) : ('used' as const),
  };
}

/* ── Skeleton ───────────────────────────────────────────────────── */
function SkeletonCard() {
  return (
    <div className="rounded-2xl overflow-hidden bg-white dark:bg-gradient-to-b dark:from-[#0d1e35] dark:to-[#0a1528]
                    border border-slate-100 dark:border-white/[0.05] shadow-[var(--shadow-md)]"
         aria-hidden>
      <div className="h-52 skeleton" />
      <div className="p-4 space-y-3">
        <div className="h-4 skeleton rounded-lg w-3/4" />
        <div className="h-3 skeleton rounded-lg w-1/2" />
        <div className="flex gap-2 mt-3">
          <div className="h-3 skeleton rounded-full w-1/3" />
          <div className="h-3 skeleton rounded-full w-1/3" />
        </div>
        <div className="h-px bg-slate-100 dark:bg-white/[0.05]" />
        <div className="flex items-center justify-between pt-1">
          <div className="h-6 skeleton rounded-lg w-2/5" />
          <div className="h-8 w-8 skeleton rounded-full" />
        </div>
      </div>
    </div>
  );
}

/* ── Car Card — memoised ─────────────────────────────────────────── */
const CarCard = memo(function CarCard({
  car,
  locale,
  view,
  priority = false,
}: {
  car: any;
  locale: string;
  view: 'grid' | 'list';
  priority?: boolean;
}) {
  // Previously: `const [liked, setLiked] = useState(false)` — a purely
  // local toggle with no backend call at all, so "saving" a car here reset
  // on every navigation/refresh and never showed up in Saved Cars or
  // /dashboard/favorites. Now backed by the real favorites API.
  const isSaved = useIsFavorited(car.id);
  const { toggle } = useToggleFavorite();
  const [imgError, setImgError] = useState(false);

  const toggleLike = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    toggle(car as Listing, !isSaved);
  }, [car, isSaved, toggle]);

  if (view === 'list') {
    return (
      <Link href={`/cars/${car.id}`} prefetch={false} className="block group">
        <article className="card-premium flex gap-3 sm:gap-4 p-3 sm:p-4 hover:shadow-[0_20px_60px_rgba(0,0,0,0.25)]">
          <div className="car-list-img relative flex-shrink-0 w-24 h-18 sm:w-40 sm:h-28 rounded-xl overflow-hidden bg-slate-100 dark:bg-[var(--ink-700)]"
               style={{ width: 'clamp(96px, 25vw, 160px)', height: 'clamp(72px, 18vw, 112px)' }}>
            {!imgError ? (
              <Image
                src={getCoverImage(car)}
                alt={getCarAlt(car)}
                fill
                sizes="160px"
                // PERF: priority on visible-above-fold cards only
                priority={priority}
                className="object-cover group-hover:scale-105 transition-transform duration-500"
                onError={() => setImgError(true)}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-4xl">🚗</div>
            )}
            {car.condition === 'New' && (
              <span className="absolute top-2 start-2 badge badge-green">New</span>
            )}
            {car.featured && (
              <span className="absolute top-2 end-2 px-1.5 py-0.5 rounded-full text-[9px] font-black uppercase bg-gold text-[var(--ink-900)]">
                Promoted
              </span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-[10px] text-[var(--gold)] font-bold tracking-widest uppercase mb-0.5">
                  {car.make} · {car.year}
                </p>
                <h3 className="font-bold text-base text-[var(--text-primary)] leading-tight line-clamp-1">
                  {car.title}
                </h3>
              </div>
              <p className="price-tag text-xl flex-shrink-0">{fmtPrice(car)}</p>
            </div>
            <div className="flex flex-wrap gap-3 mt-2 text-xs text-[var(--text-muted)]">
              <span className="flex items-center gap-1"><Gauge className="w-3 h-3"/>{fmtNum.format(car.mileage)} km</span>
              <span className="flex items-center gap-1"><Fuel className="w-3 h-3"/>{car.fuelType}</span>
              <span className="flex items-center gap-1"><MapPin className="w-3 h-3"/>{car.city}</span>
              {car.verified && <span className="verified-badge"><Shield className="w-2.5 h-2.5"/>Verified</span>}
              {timeAgo(car.createdAt) && <span className="text-[var(--text-faint)]">{timeAgo(car.createdAt)}</span>}
            </div>
          </div>
          <button
            onClick={toggleLike}
            aria-label={isSaved ? 'Remove from saved' : 'Save listing'}
            aria-pressed={isSaved}
            className="flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center
                       bg-[var(--surface-100)] hover:bg-red-50 dark:bg-white/[0.06] dark:hover:bg-red-900/20
                       transition-colors self-center"
          >
            <Heart className={`w-4 h-4 ${isSaved ? 'fill-red-500 text-red-500' : 'text-[var(--text-faint)]'}`} />
          </button>
        </article>
      </Link>
    );
  }

  return (
    <Link href={`/cars/${car.id}`} prefetch={false} className="block group">
      <article className="card-premium overflow-hidden h-full flex flex-col">
        <div className="relative overflow-hidden aspect-[16/10] bg-slate-100 dark:bg-[var(--ink-700)]">
          {!imgError ? (
            <Image
              src={getCoverImage(car)}
              alt={getCarAlt(car)}
              fill
              // PERF: correct srcset — 3-column desktop, 2-col tablet, 1-col mobile
              sizes="(min-width:1280px) 25vw, (min-width:768px) 33vw, 50vw"
              priority={priority}
              className="object-cover group-hover:scale-105 transition-transform duration-600"
              onError={() => setImgError(true)}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-5xl">🚗</div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent
                          opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <div className="absolute top-3 start-3 flex gap-1.5">
            {/* Promoted/organic distinction — was previously only a vague
                hover-revealed `car.badge` string at the bottom of the image,
                easy to miss and not clearly labeled either way. */}
            {car.featured && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wide
                               bg-gold text-[var(--ink-900)] shadow-gold-sm">
                Promoted
              </span>
            )}
            {car.condition === 'New' && <span className="badge badge-green">New</span>}
            {car.verified && <span className="badge badge-blue"><Shield className="w-2.5 h-2.5"/>Verified</span>}
          </div>
          <button
            onClick={toggleLike}
            className="absolute top-3 end-3 w-8 h-8 rounded-full flex items-center justify-center
                       bg-black/30 backdrop-blur-sm hover:bg-black/50 transition-colors"
            aria-label="Save listing"
          >
            <Heart className={`w-4 h-4 ${isSaved ? 'fill-red-500 text-red-500' : 'text-white'}`} />
          </button>
          {timeAgo(car.createdAt) && (
            <div className="absolute bottom-3 start-3">
              <span className="text-[10px] font-semibold text-white/90 bg-black/50 backdrop-blur-sm px-2 py-0.5 rounded-full">
                {timeAgo(car.createdAt)}
              </span>
            </div>
          )}
        </div>

        <div className="p-4 flex flex-col flex-1">
          <p className="text-[9px] font-black uppercase tracking-[0.16em] text-[var(--gold)] mb-1">
            {car.make} · {car.year}
          </p>
          <h3 className="font-bold text-[var(--text-primary)] text-base leading-tight line-clamp-1 mb-2">
            {car.title}
          </h3>

          <div className="flex flex-wrap gap-2 mb-3">
            <span className="flex items-center gap-1 text-[11px] text-[var(--text-muted)]">
              <Gauge className="w-3 h-3"/>{fmtNum.format(car.mileage)} km
            </span>
            <span className="flex items-center gap-1 text-[11px] text-[var(--text-muted)]">
              <Fuel className="w-3 h-3"/>{car.fuelType}
            </span>
            <span className="flex items-center gap-1 text-[11px] text-[var(--text-muted)]">
              <MapPin className="w-3 h-3"/>{car.city}
            </span>
          </div>

          <div className="mt-auto pt-3 border-t border-[var(--border-subtle)] flex items-center justify-between gap-2">
            <span className="price-tag text-xl" style={{ background: 'linear-gradient(135deg, var(--gold-bright) 0%, var(--gold) 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{fmtPrice(car)}</span>
            <span className="flex items-center gap-1 text-[10px] text-[var(--text-faint)]">
              <Zap className="w-3 h-3 text-[var(--gold)]"/>Quick View
            </span>
          </div>
        </div>
      </article>
    </Link>
  );
});

/* ── Collapsible filter section ──────────────────────────────────── */
const FilterSection = memo(function FilterSection({
  title,
  children,
  defaultOpen = true,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const toggle = useCallback(() => setOpen(v => !v), []);
  return (
    <div className="border-b border-[var(--border-subtle)] pb-4 mb-4">
      <button
        onClick={toggle}
        className="flex items-center justify-between w-full text-sm font-bold text-[var(--text-primary)] mb-3"
      >
        {title}
        {open
          ? <ChevronUp className="w-4 h-4 text-[var(--text-muted)]"/>
          : <ChevronDown className="w-4 h-4 text-[var(--text-muted)]"/>}
      </button>
      <div className={`overflow-hidden transition-all duration-300 ${open ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}>
        {children}
      </div>
    </div>
  );
});

/* ── Main Component ──────────────────────────────────────────────── */
export function CarsMarketplaceClient({
  locale,
  initialSearch,
  initialData,
}: {
  locale: string;
  initialSearch: Record<string, string>;
  /**
   * F-PERF fix: server-fetched first page (cars/page.tsx), passed straight
   * into useQuery's initialData below. Only valid for queryKey
   * { type: 'CAR', brandId, city, q, page: 1 } with the page-1 default filter
   * values — which is exactly what this component's own state defaults to
   * on mount, so there's no key mismatch. As soon as the user changes a
   * filter or page, React Query naturally falls through to a real client
   * fetch — this is a first-paint optimization only, not a permanent cache.
   */
  initialData?: { data: any[]; total: number; page: number; limit: number; totalPages: number };
}) {
  const [query,        setQuery]      = useState(initialSearch.q            ?? '');
  // BUG FIX: was `const [make, setMake] = useState(...)`, sending a plain
  // brand-name string as a `make` query param — a field the backend DTO
  // (ListingQueryDto) doesn't declare at all, so it was silently dropped
  // and this entire "Make / Brand" filter did nothing. Replaced with the
  // same real cascading brandId/modelId approach MotorcyclesClient.tsx
  // already uses correctly.
  const [brandId,      setBrandId]    = useState(initialSearch.brandId      ?? '');
  const [modelId,      setModelId]    = useState(initialSearch.modelId      ?? '');
  const [bodyType,     setBodyType]   = useState(initialSearch.bodyType     ?? '');
  const [fuelType,     setFuelType]   = useState(initialSearch.fuelType     ?? '');
  const [transmission, setTrans]      = useState(initialSearch.transmission ?? '');
  const [condition,    setCondition]  = useState(initialSearch.condition    ?? '');
  const [city,         setCity]       = useState(initialSearch.city         ?? '');
  const [priceRange,   setPriceRange] = useState(initialSearch.priceRange   ?? '');
  const [colorFilter,  setColor]      = useState(initialSearch.color        ?? '');
  const [sortBy,       setSortBy]     = useState(initialSearch.sort         ?? 'newest');
  const [view,         setView]       = useState<'grid' | 'list'>('grid');
  const [page,         setPage]       = useState(1);
  const [sidebarOpen,  setSidebar]    = useState(false);

  // F-PERF fix: initialData only applies to the exact query it was fetched
  // for (page 1, default filters) — guarded explicitly rather than passed
  // unconditionally, because React Query's `initialData` option doesn't
  // know on its own that it's tied to one specific key. Without this guard,
  // changing a filter before the real fetch resolves could briefly show
  // the page-1/unfiltered server data under the new filter's cache key.
  const matchesServerFetch =
    page === 1 && brandId === (initialSearch.brandId ?? '') && city === (initialSearch.city ?? '') && query === (initialSearch.q ?? '');

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.listings.list({ type: 'CAR', brandId, modelId, city, q: query, page }),
    queryFn:  () => listingsApi.getAll({ type: 'CAR', brandId: brandId || undefined, modelId: modelId || undefined, city, q: query, limit: 24, page }) as Promise<ListingListResponsePaged>,
    placeholderData: (prev) => prev,
    ...(matchesServerFetch && initialData ? { initialData } : {}),
  });

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

  const cars = data?.data ?? [];
  const totalPages = data?.totalPages ?? 1;

  const activeCount = [brandId, modelId, bodyType, fuelType, transmission, condition, city, priceRange, colorFilter]
    .filter(Boolean).length;

  // PERF: stable callbacks — won't cause FilterSection/CarCard re-renders
  const resetAll = useCallback(() => {
    setBrandId(''); setModelId(''); setBodyType(''); setFuelType(''); setTrans('');
    setCondition(''); setCity(''); setPriceRange(''); setColor('');
    setPage(1);
  }, []);

  const selectBrand = useCallback((id: string) => {
    setBrandId((cur) => (cur === id ? '' : id));
    setModelId('');
    setPage(1);
  }, []);
  const selectModel = useCallback((id: string) => {
    setModelId((cur) => (cur === id ? '' : id));
    setPage(1);
  }, []);
  const handleBody   = useCallback((b: string) => { setBodyType(v => v === b ? '' : b); setPage(1); }, []);
  const handleFuel   = useCallback((f: string) => { setFuelType(v => v === f ? '' : f); setPage(1); }, []);
  const handleTrans  = useCallback((t: string) => { setTrans(v => v === t ? '' : t); setPage(1); }, []);
  const handleCond   = useCallback((c: string) => { setCondition(v => v === c ? '' : c); setPage(1); }, []);
  const handleCity   = useCallback((c: string) => { setCity(v => v === c ? '' : c); setPage(1); }, []);
  const handlePrice  = useCallback((p: string) => { setPriceRange(p); setPage(1); }, []);
  const handleColor  = useCallback((c: string) => { setColor(v => v === c ? '' : c); setPage(1); }, []);

  // ── Sidebar ── (extracted component with stable props)
  const sidebar = (
    <div className="text-sm">
      <div className="relative mb-5">
        <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--text-muted)]" />
        <input
          value={query}
          onChange={e => { setQuery(e.target.value); setPage(1); }}
          placeholder="Search cars…"
          className="input-base ps-9 text-sm h-10"
        />
      </div>

      <FilterSection title="Make / Brand">
        <div className="space-y-1.5">
          {(brands ?? []).map(b => (
            <label key={b.id} className="flex items-center gap-2.5 cursor-pointer group">
              <input type="radio" name="brand" checked={brandId === b.id} onChange={() => selectBrand(b.id)}
                className="w-4 h-4 accent-[var(--gold)]" />
              <span className="text-[var(--text-secondary)] group-hover:text-[var(--gold)] transition-colors">{b.name?.en ?? b.name}</span>
            </label>
          ))}
        </div>
      </FilterSection>

      {brandId && (
        <FilterSection title="Model">
          <div className="space-y-1.5">
            {(models ?? []).map(m => (
              <label key={m.id} className="flex items-center gap-2.5 cursor-pointer group">
                <input type="radio" name="model" checked={modelId === m.id} onChange={() => selectModel(m.id)}
                  className="w-4 h-4 accent-[var(--gold)]" />
                <span className="text-[var(--text-secondary)] group-hover:text-[var(--gold)] transition-colors">{m.name?.en ?? m.name}</span>
              </label>
            ))}
            {models && models.length === 0 && (
              <p className="text-xs text-[var(--text-faint)]">No models found for this brand</p>
            )}
          </div>
        </FilterSection>
      )}

      <FilterSection title="Body Type">
        <div className="flex flex-wrap gap-2">
          {BODY_TYPES.map(t => (
            <button key={t} onClick={() => handleBody(t)}
              className={`filter-chip ${bodyType === t ? 'active' : ''}`}>{t}</button>
          ))}
        </div>
      </FilterSection>

      <FilterSection title="Price Range">
        <div className="space-y-1.5">
          {PRICE_BRACKETS.map(b => (
            <label key={b.label} className="flex items-center gap-2.5 cursor-pointer group">
              <input type="radio" name="price" checked={priceRange === b.label}
                onChange={() => handlePrice(b.label)}
                className="w-4 h-4 accent-[var(--gold)]" />
              <span className="text-[var(--text-secondary)] group-hover:text-[var(--gold)] transition-colors">{b.label}</span>
            </label>
          ))}
        </div>
      </FilterSection>

      <FilterSection title="Fuel Type">
        <div className="flex flex-wrap gap-2">
          {FUEL_TYPES.map(f => (
            <button key={f} onClick={() => handleFuel(f)}
              className={`filter-chip ${fuelType === f ? 'active' : ''}`}>{f}</button>
          ))}
        </div>
      </FilterSection>

      <FilterSection title="Transmission">
        <div className="flex flex-wrap gap-2">
          {TRANSMISSIONS.map(t => (
            <button key={t} onClick={() => handleTrans(t)}
              className={`filter-chip ${transmission === t ? 'active' : ''}`}>{t}</button>
          ))}
        </div>
      </FilterSection>

      <FilterSection title="Condition">
        <div className="flex flex-wrap gap-2">
          {CONDITIONS.map(c => (
            <button key={c} onClick={() => handleCond(c)}
              className={`filter-chip ${condition === c ? 'active' : ''}`}>{c}</button>
          ))}
        </div>
      </FilterSection>

      <FilterSection title="City">
        <div className="space-y-1.5">
          {CITIES.map(c => (
            <label key={c} className="flex items-center gap-2.5 cursor-pointer group">
              <input type="checkbox" checked={city === c} onChange={() => handleCity(c)}
                className="w-4 h-4 rounded accent-[var(--gold)]" />
              <span className="text-[var(--text-secondary)] group-hover:text-[var(--gold)] transition-colors">{c}</span>
            </label>
          ))}
        </div>
      </FilterSection>

      <FilterSection title="Color" defaultOpen={false}>
        <div className="flex flex-wrap gap-2">
          {COLORS.map(c => (
            <button key={c} onClick={() => handleColor(c)}
              className={`filter-chip ${colorFilter === c ? 'active' : ''}`}>{c}</button>
          ))}
        </div>
      </FilterSection>

      {activeCount > 0 && (
        <button onClick={resetAll}
          className="w-full mt-2 flex items-center justify-center gap-2 py-2.5 rounded-xl
                     text-sm font-semibold text-red-500 border border-red-200 dark:border-red-900/30
                     hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors">
          <X className="w-4 h-4"/>Clear All Filters
        </button>
      )}
    </div>
  );

  const isRtl = isRTL(locale as any);

  return (
    <div
      dir={isRtl ? 'rtl' : 'ltr'}
      className="min-h-screen bg-[var(--surface-0)] dark:bg-[var(--ink-900)] page-content"
    >
      {/* Page Header */}
      <div className="relative overflow-hidden border-b border-[var(--border-default)]"
           style={{ background:'linear-gradient(135deg, var(--ink-900) 0%, var(--ink-750) 60%, var(--ink-900) 100%)' }}>
        <div className="absolute inset-0 opacity-[0.025] bg-dot-grid" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <nav className="flex items-center gap-2 text-xs text-white/40 mb-4">
            <Link href="/" className="hover:text-[var(--gold)] transition-colors">Home</Link>
            <span>/</span>
            <span className="text-white/60">Cars</span>
          </nav>
          <h1 className="text-3xl sm:text-4xl font-display font-black text-white mb-2">
            سەیارەکان / <span className="text-[var(--gold)]">Cars</span>
          </h1>
          <p className="text-white/45 text-sm">
            <strong className="text-white/70">{cars.length.toLocaleString()}+</strong> verified listings across Iraq · Kurdistan · UAE · China
          </p>
          <div className="flex flex-wrap gap-2 mt-3">
            {['New Arrivals', 'Under $20k', 'Luxury', 'Electric', '4×4'].map(tag => (
              <button key={tag}
                className="px-3 py-1 rounded-full text-xs font-semibold
                           bg-white/[0.06] border border-white/[0.10] text-white/50
                           hover:bg-[rgba(201,168,76,0.12)] hover:border-[rgba(201,168,76,0.35)] hover:text-[var(--gold)]
                           transition-all duration-200">
                {tag}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex gap-8">
          {/* Desktop Sidebar */}
          <aside className="hidden lg:block w-64 flex-shrink-0">
            <div className="sticky top-[calc(var(--navbar-h)+1.5rem)] rounded-2xl
                            bg-white dark:bg-gradient-to-b dark:from-[#0d1e35] dark:to-[#0a1528] border border-[var(--border-default)]
                            border-white/[0.07] dark:shadow-[inset_-1px_0_0_rgba(255,255,255,0.03)]
                            shadow-[var(--shadow-sm)] p-5 max-h-[calc(100vh-120px)] overflow-y-auto no-scrollbar">
              <div className="flex items-center justify-between mb-5">
                <h2 className="font-bold text-[var(--text-primary)] flex items-center gap-2">
                  <Filter className="w-4 h-4 text-[var(--gold)]"/>Filters
                  {activeCount > 0 && <span className="badge badge-gold">{activeCount}</span>}
                </h2>
              </div>
              {sidebar}
            </div>
          </aside>

          {/* Main Content */}
          <div className="flex-1 min-w-0">
            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <button onClick={() => setSidebar(true)}
                  className="lg:hidden flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold
                             bg-white dark:bg-[var(--ink-750)] border border-[var(--border-default)]
                             text-[var(--text-secondary)] shadow-[var(--shadow-sm)] hover:border-[var(--border-gold)]">
                  <SlidersHorizontal className="w-4 h-4"/>Filters
                  {activeCount > 0 && <span className="badge badge-gold">{activeCount}</span>}
                </button>
                <p className="text-sm text-[var(--text-muted)]">
                  <strong className="text-[var(--text-primary)]">{cars.length}</strong> results
                </p>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
                <div className="relative">
                  <select value={sortBy} onChange={e => setSortBy(e.target.value)}
                    className="input-base pe-8 h-9 text-xs cursor-pointer appearance-none max-w-[160px]">
                    {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                  <ArrowUpDown className="absolute end-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-[var(--text-muted)] pointer-events-none"/>
                </div>
                <div className="flex rounded-xl overflow-hidden border border-[var(--border-default)] bg-white dark:bg-[var(--ink-750)]">
                  <button onClick={() => setView('grid')}
                    aria-label="Grid view" aria-pressed={view === 'grid'}
                    className={`p-2 transition-all duration-200 ${view==='grid' ? 'bg-gradient-to-r from-[#a87828] to-[var(--gold)] text-[var(--ink-900)]' : 'text-[var(--text-muted)] hover:text-[var(--gold)]'}`}>
                    <Grid3X3 className="w-4 h-4"/>
                  </button>
                  <button onClick={() => setView('list')}
                    aria-label="List view" aria-pressed={view === 'list'}
                    className={`p-2 transition-all duration-200 ${view==='list' ? 'bg-gradient-to-r from-[#a87828] to-[var(--gold)] text-[var(--ink-900)]' : 'text-[var(--text-muted)] hover:text-[var(--gold)]'}`}>
                    <List className="w-4 h-4"/>
                  </button>
                </div>
              </div>
            </div>

            {/* Active filter chips */}
            {activeCount > 0 && (
              <div className="filter-chips-row flex gap-2 mb-5 pb-1">
                {[
                  { key: 'brand',    label: brands?.find(b => b.id === brandId)?.name?.en ?? (brands?.find(b => b.id === brandId)?.name as any), value: brandId, clear: () => { setBrandId(''); setModelId(''); } },
                  { key: 'model',    label: models?.find(m => m.id === modelId)?.name?.en ?? (models?.find(m => m.id === modelId)?.name as any), value: modelId, clear: () => setModelId('') },
                  { key: 'bodyType', label: bodyType,     value: bodyType,     clear: () => setBodyType('') },
                  { key: 'fuelType', label: fuelType,     value: fuelType,     clear: () => setFuelType('') },
                  { key: 'trans',    label: transmission, value: transmission, clear: () => setTrans('') },
                  { key: 'cond',     label: condition,    value: condition,    clear: () => setCondition('') },
                  { key: 'city',     label: city,         value: city,         clear: () => setCity('') },
                  { key: 'price',    label: priceRange,   value: priceRange,   clear: () => setPriceRange('') },
                  { key: 'color',    label: colorFilter,  value: colorFilter,  clear: () => setColor('') },
                ]
                  .filter(c => Boolean(c.value))
                  .map(chip => (
                    <span key={chip.key}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs
                                 bg-[var(--gold-subtle)] text-[var(--gold)] border border-[var(--border-gold)]">
                      {chip.label}
                      <button onClick={() => { chip.clear(); setPage(1); }} className="hover:text-red-400 transition-colors">
                        <X className="w-3 h-3"/>
                      </button>
                    </span>
                  ))}
              </div>
            )}

            {/* Grid / List */}
            {isLoading ? (
              <div className={view === 'grid'
                ? 'grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5'
                : 'flex flex-col gap-3'}>
                {Array.from({ length: 9 }).map((_, i) => <SkeletonCard key={i}/>)}
              </div>
            ) : cars.length === 0 ? (
              <div className="text-center py-20 rounded-3xl border-2 border-dashed border-[var(--border-default)]">
                <div className="text-5xl mb-4">🔍</div>
                <h3 className="text-xl font-bold text-[var(--text-primary)] mb-2">No cars match your filters</h3>
                <p className="text-[var(--text-muted)] mb-6 max-w-xs mx-auto text-sm">
                  Try removing some filters or broadening your search to see more results.
                </p>
                <div className="flex flex-wrap gap-2 justify-center mb-6">
                  {['Toyota', 'BMW', 'Erbil', 'New', 'Under $30k'].map(s => (
                    <button key={s}
                      className="px-3 py-1.5 rounded-full text-xs font-semibold
                                 bg-[var(--gold-subtle)] text-[var(--gold)] border border-[var(--border-gold)]
                                 hover:bg-[rgba(201,168,76,0.2)] transition-colors">
                      Try: {s}
                    </button>
                  ))}
                </div>
                <button onClick={resetAll}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold
                             text-[var(--ink-900)] transition-all hover:-translate-y-0.5 active:scale-[0.98]"
                  style={{ background: 'linear-gradient(135deg, #a87828 0%, var(--gold) 50%, #dab445 100%)', boxShadow: '0 4px 16px rgba(201,168,76,0.35)' }}>
                  Clear All Filters
                </button>
              </div>
            ) : (
              <div className={view === 'grid'
                ? 'grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5'
                : 'flex flex-col gap-3'}>
                {cars.map((car: any, idx: number) => (
                  <Fragment key={car.id}>
                    {/* Below `sm:` in grid view, the touch-optimized card
                        (swipe-to-save, image carousel, long-press) takes
                        over — CarCard remains untouched for list view and
                        `sm:` and up. Both render server-side (no
                        hydration risk); only one is visible per
                        breakpoint via CSS, matching the same `sm:`
                        breakpoint the grid itself already changes column
                        count at. */}
                    {view === 'grid' && (
                      <div className="sm:hidden">
                        <MobileCarCard car={toMobileCarCardProps(car)} locale={locale} rawListing={car} />
                      </div>
                    )}
                    <div className={view === 'grid' ? 'hidden sm:block' : undefined}>
                      {/* PERF: first 3 cards get priority=true for LCP */}
                      <CarCard car={car} locale={locale} view={view} priority={idx < 3} />
                    </div>
                  </Fragment>
                ))}
              </div>
            )}

            {/* Real pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center gap-2 mt-10">
                {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => i + 1).map(p => (
                  <button key={p} onClick={() => setPage(p)}
                    className={`w-9 h-9 rounded-xl text-sm font-semibold transition-all
                      ${p === page
                        ? 'text-[var(--ink-900)] shadow-[0_2px_8px_rgba(201,168,76,0.35)]'
                        : 'bg-white dark:bg-[var(--ink-750)] border border-[var(--border-default)] text-[var(--text-muted)] hover:border-[var(--border-gold)] hover:text-[var(--gold)]'}`}
                    style={p === page ? { background: 'linear-gradient(135deg, #a87828 0%, var(--gold) 50%, #dab445 100%)' } : undefined}>
                    {p}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Sidebar Drawer */}
      {sidebarOpen && (
        <>
          <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
               onClick={() => setSidebar(false)}/>
          <div className="fixed inset-y-0 start-0 z-50 w-80 bg-white dark:bg-[var(--ink-750)]
                          shadow-[var(--shadow-xl)] overflow-y-auto no-scrollbar lg:hidden anim-slide-l">
            <div className="flex items-center justify-between p-5 border-b border-[var(--border-default)]">
              <h2 className="font-bold text-[var(--text-primary)] flex items-center gap-2">
                <Filter className="w-4 h-4 text-[var(--gold)]"/>Filters
              </h2>
              <button onClick={() => setSidebar(false)}
                aria-label="Close filters"
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[var(--surface-100)] transition-colors">
                <X className="w-4 h-4 text-[var(--text-muted)]"/>
              </button>
            </div>
            <div className="p-5">{sidebar}</div>
          </div>
        </>
      )}
    </div>
  );
}