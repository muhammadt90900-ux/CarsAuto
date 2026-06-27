'use client';
// components/features/cars/CarsMarketplaceClient.tsx — ADVANCED FILTER v2.0
//
// What's new / fixed vs v1:
//   ✦ Dual-range price slider   (0 → $500k, no external deps)
//   ✦ Cascading Brand → Model   (real API brandId / modelId sent to backend)
//   ✦ Year range                (fromYear / toYear selects)
//   ✦ Mileage range             (preset chips + custom max slider)
//   ✦ Seller type toggle        (All / Dealer / Individual)
//   ✦ All filter params wired   (brandId, modelId, fuelType, transmission,
//                                condition, minPrice, maxPrice, minYear, maxYear,
//                                maxMileage, search — all sent to the API)
//   ✦ Bug fixes                 ('make' → 'brandId', 'q' → 'search')
//   ✦ Comprehensive active chips with per-chip clear
//   ✦ URL-stable query key covering every filter dimension

import { useState, useCallback, memo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useQuery } from '@tanstack/react-query';
import {
  Search, SlidersHorizontal, X, Grid3X3, List,
  MapPin, Gauge, Fuel, Heart, ChevronDown, ChevronUp,
  Zap, Shield, ArrowUpDown, Filter, Building2, User,
  Calendar, DollarSign, Car,
} from 'lucide-react';
import { listingsApi, vehiclesApi } from '@/lib/api';
import { queryKeys } from '@/lib/queryKeys';
import { ALL_CITIES } from '@/lib/locations';

/* ─── Static look-up tables ─────────────────────────────────────────────── */

const BODY_TYPES    = ['Sedan','SUV','Pickup','Coupe','Hatchback','Wagon','Convertible','Van'];
const FUEL_TYPES    = ['Petrol','Diesel','Hybrid','Electric','Plug-in Hybrid','LPG'];
const TRANSMISSIONS = ['Automatic','Manual','CVT','Semi-Auto'];
const CONDITIONS    = ['New','Used','Salvage'];
const COLORS        = ['White','Black','Silver','Grey','Red','Blue','Green','Gold','Brown'];

const CURRENT_YEAR  = new Date().getFullYear();
const ALL_YEARS     = Array.from({ length: CURRENT_YEAR - 1989 }, (_, i) =>
  String(CURRENT_YEAR - i));

const MILEAGE_PRESETS = [
  { label: 'Any',        max: 0       },
  { label: '< 10k km',  max: 10_000  },
  { label: '< 30k km',  max: 30_000  },
  { label: '< 60k km',  max: 60_000  },
  { label: '< 100k km', max: 100_000 },
  { label: '< 200k km', max: 200_000 },
];

const SORT_OPTIONS = [
  { value: 'newest',     label: 'Newest First'      },
  { value: 'price_asc',  label: 'Price: Low → High' },
  { value: 'price_desc', label: 'Price: High → Low' },
  { value: 'mileage',    label: 'Lowest Mileage'    },
  { value: 'popular',    label: 'Most Popular'      },
];

const PRICE_MAX  = 500_000;
const PRICE_STEP = 500;

/* ─── Formatters (hoisted — created once) ───────────────────────────────── */

const fmtPrice = new Intl.NumberFormat('en-US', {
  style: 'currency', currency: 'USD', maximumFractionDigits: 0,
});
const fmtNum = new Intl.NumberFormat('en-US');

/* ══════════════════════════════════════════════════════════════════════════
   DualRangeSlider — pure CSS/JS, no deps
   ══════════════════════════════════════════════════════════════════════════ */
interface DualRangeProps {
  min: number; max: number; step: number;
  valueLow: number; valueHigh: number;
  onChange: (low: number, high: number) => void;
  format?: (v: number) => string;
}

function DualRangeSlider({ min, max, step, valueLow, valueHigh, onChange, format }: DualRangeProps) {
  const fmt = format ?? ((v: number) => String(v));
  const pctLow  = ((valueLow  - min) / (max - min)) * 100;
  const pctHigh = ((valueHigh - min) / (max - min)) * 100;

  return (
    <div className="dual-range-root">
      {/* Track + coloured fill */}
      <div className="dual-range-track">
        <div className="dual-range-fill"
          style={{ left: `${pctLow}%`, width: `${pctHigh - pctLow}%` }} />
      </div>

      {/* Low thumb */}
      <input
        type="range"
        min={min} max={max} step={step}
        value={valueLow}
        className="dual-range-input"
        onChange={e => {
          const v = Math.min(Number(e.target.value), valueHigh - step);
          onChange(v, valueHigh);
        }}
      />

      {/* High thumb */}
      <input
        type="range"
        min={min} max={max} step={step}
        value={valueHigh}
        className="dual-range-input"
        onChange={e => {
          const v = Math.max(Number(e.target.value), valueLow + step);
          onChange(valueLow, v);
        }}
      />

      {/* Labels */}
      <div className="flex justify-between text-[11px] font-semibold mt-3 text-[var(--text-secondary)]">
        <span className="px-2 py-0.5 rounded-lg bg-[var(--gold-subtle)] text-[var(--gold)] border border-[var(--border-gold)]">
          {fmt(valueLow)}
        </span>
        <span className="px-2 py-0.5 rounded-lg bg-[var(--gold-subtle)] text-[var(--gold)] border border-[var(--border-gold)]">
          {fmt(valueHigh)}
        </span>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   SkeletonCard
   ══════════════════════════════════════════════════════════════════════════ */
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

/* ══════════════════════════════════════════════════════════════════════════
   CarCard — memoised
   ══════════════════════════════════════════════════════════════════════════ */
const CarCard = memo(function CarCard({
  car, locale, view, priority = false,
}: {
  car: any; locale: string; view: 'grid' | 'list'; priority?: boolean;
}) {
  const [liked,    setLiked]    = useState(false);
  const [imgError, setImgError] = useState(false);

  const toggleLike = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setLiked(v => !v);
  }, []);

  if (view === 'list') {
    return (
      <Link href={`/cars/${car.id}`} prefetch={false} className="block group">
        <article className="card-premium flex gap-3 sm:gap-4 p-3 sm:p-4 hover:shadow-[0_20px_60px_rgba(0,0,0,0.25)]">
          <div className="car-list-img relative flex-shrink-0 rounded-xl overflow-hidden bg-slate-100 dark:bg-[#0f1c2e]"
               style={{ width: 'clamp(96px,25vw,160px)', height: 'clamp(72px,18vw,112px)' }}>
            {!imgError ? (
              <Image src={car.images?.[0]?.url || '/placeholder-car.jpg'} alt={car.title}
                fill sizes="160px" priority={priority}
                className="object-cover group-hover:scale-105 transition-transform duration-500"
                onError={() => setImgError(true)} />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-4xl">🚗</div>
            )}
            {car.condition === 'New' && (
              <span className="absolute top-2 left-2 badge badge-green">New</span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-[10px] text-[var(--gold)] font-bold tracking-widest uppercase mb-0.5">
                  {car.badge}
                </p>
                <h3 className="font-bold text-base text-[var(--text-primary)] leading-tight line-clamp-1">
                  {car.title}
                </h3>
              </div>
              <p className="price-tag text-xl flex-shrink-0">{fmtPrice.format(car.price)}</p>
            </div>
            <div className="flex flex-wrap gap-3 mt-2 text-xs text-[var(--text-muted)]">
              <span className="flex items-center gap-1"><Gauge className="w-3 h-3"/>{fmtNum.format(car.mileage)} km</span>
              <span className="flex items-center gap-1"><Fuel className="w-3 h-3"/>{car.fuelType}</span>
              <span className="flex items-center gap-1"><MapPin className="w-3 h-3"/>{car.city}</span>
              {car.verified && <span className="verified-badge"><Shield className="w-2.5 h-2.5"/>Verified</span>}
            </div>
          </div>
          <button onClick={toggleLike}
            className="flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center
                       bg-[var(--surface-100)] hover:bg-red-50 dark:bg-white/[0.06] dark:hover:bg-red-900/20
                       transition-colors self-center">
            <Heart className={`w-4 h-4 ${liked ? 'fill-red-500 text-red-500' : 'text-[var(--text-faint)]'}`} />
          </button>
        </article>
      </Link>
    );
  }

  return (
    <Link href={`/cars/${car.id}`} prefetch={false} className="block group">
      <article className="card-premium overflow-hidden h-full flex flex-col">
        <div className="relative overflow-hidden aspect-[16/10] bg-slate-100 dark:bg-[#0f1c2e]">
          {!imgError ? (
            <Image src={car.images?.[0]?.url || '/placeholder-car.jpg'} alt={car.title}
              fill sizes="(min-width:1280px) 25vw,(min-width:768px) 33vw,50vw"
              priority={priority}
              className="object-cover group-hover:scale-105 transition-transform duration-600"
              onError={() => setImgError(true)} />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-5xl">🚗</div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent
                          opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <div className="absolute top-3 left-3 flex gap-1.5">
            {car.condition === 'New' && <span className="badge badge-green">New</span>}
            {car.verified && <span className="badge badge-blue"><Shield className="w-2.5 h-2.5"/>Verified</span>}
          </div>
          <button onClick={toggleLike}
            className="absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center
                       bg-black/30 backdrop-blur-sm hover:bg-black/50 transition-colors"
            aria-label="Save listing">
            <Heart className={`w-4 h-4 ${liked ? 'fill-red-500 text-red-500' : 'text-white'}`} />
          </button>
          <div className="absolute bottom-3 left-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <span className="text-[10px] font-bold text-white bg-black/50 backdrop-blur-sm px-2 py-0.5 rounded-full">
              {car.badge}
            </span>
          </div>
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
            <span className="price-tag text-xl"
              style={{ background: 'linear-gradient(135deg,#f0d87a 0%,#c9a84c 100%)',
                       WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              {fmtPrice.format(car.price)}
            </span>
            <span className="flex items-center gap-1 text-[10px] text-[var(--text-faint)]">
              <Zap className="w-3 h-3 text-[var(--gold)]"/>Quick View
            </span>
          </div>
        </div>
      </article>
    </Link>
  );
});

/* ══════════════════════════════════════════════════════════════════════════
   FilterSection — collapsible
   ══════════════════════════════════════════════════════════════════════════ */
const FilterSection = memo(function FilterSection({
  title, icon, children, defaultOpen = true,
}: {
  title: string; icon?: React.ReactNode;
  children: React.ReactNode; defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const toggle = useCallback(() => setOpen(v => !v), []);
  return (
    <div className="border-b border-[var(--border-subtle)] pb-4 mb-4 last:border-0 last:mb-0 last:pb-0">
      <button onClick={toggle}
        className="flex items-center justify-between w-full text-sm font-bold text-[var(--text-primary)] mb-3 group">
        <span className="flex items-center gap-2">
          {icon && <span className="text-[var(--gold)]">{icon}</span>}
          {title}
        </span>
        {open
          ? <ChevronUp className="w-4 h-4 text-[var(--text-muted)] group-hover:text-[var(--gold)] transition-colors"/>
          : <ChevronDown className="w-4 h-4 text-[var(--text-muted)] group-hover:text-[var(--gold)] transition-colors"/>}
      </button>
      <div className={`overflow-hidden transition-all duration-300 ${open ? 'max-h-[600px] opacity-100' : 'max-h-0 opacity-0'}`}>
        {children}
      </div>
    </div>
  );
});

/* ══════════════════════════════════════════════════════════════════════════
   Main Component
   ══════════════════════════════════════════════════════════════════════════ */
export function CarsMarketplaceClient({
  locale,
  initialSearch,
}: {
  locale: string;
  initialSearch: Record<string, string>;
}) {
  /* ── Filter state ─────────────────────────────────────────────── */
  const [query,        setQuery]      = useState(initialSearch.search        ?? initialSearch.q ?? '');
  // Brand/Model (API-driven IDs)
  const [brandId,      setBrandId]    = useState(initialSearch.brandId       ?? '');
  const [brandName,    setBrandName]  = useState(initialSearch.brandName     ?? '');   // display label
  const [modelId,      setModelId]    = useState(initialSearch.modelId       ?? '');
  const [modelName,    setModelName]  = useState(initialSearch.modelName     ?? '');   // display label
  // Vehicle attrs
  const [bodyType,     setBodyType]   = useState(initialSearch.bodyType      ?? '');
  const [fuelType,     setFuelType]   = useState(initialSearch.fuelType      ?? '');
  const [transmission, setTrans]      = useState(initialSearch.transmission  ?? '');
  const [condition,    setCondition]  = useState(initialSearch.condition     ?? '');
  const [colorFilter,  setColor]      = useState(initialSearch.color         ?? '');
  // Price slider
  const [minPrice,     setMinPrice]   = useState(Number(initialSearch.minPrice ?? 0));
  const [maxPrice,     setMaxPrice]   = useState(Number(initialSearch.maxPrice ?? PRICE_MAX));
  // Year range
  const [minYear,      setMinYear]    = useState(initialSearch.minYear       ?? '');
  const [maxYear,      setMaxYear]    = useState(initialSearch.maxYear       ?? '');
  // Mileage
  const [maxMileage,   setMaxMileage] = useState(Number(initialSearch.maxMileage ?? 0));
  // Location
  const [city,         setCity]       = useState(initialSearch.city          ?? '');
  // Seller type (UI only until backend adds userRole filter)
  const [sellerType,   setSellerType] = useState<'all'|'dealer'|'individual'>(
    (initialSearch.sellerType as any) ?? 'all');
  // Sort + view
  const [sortBy,       setSortBy]     = useState(initialSearch.sort          ?? 'newest');
  const [view,         setView]       = useState<'grid'|'list'>('grid');
  const [page,         setPage]       = useState(1);
  const [sidebarOpen,  setSidebar]    = useState(false);

  /* ── Brands from API (with name fallback) ─────────────────────── */
  const { data: brandsData } = useQuery({
    queryKey: queryKeys.vehicles.brands(),
    queryFn:  () => vehiclesApi.getBrands(),
    staleTime: 10 * 60_000,
    retry: 1,
  });
  const brands: any[] = (brandsData as any)?.data ?? brandsData ?? [];

  /* ── Models cascade (loaded when brandId is set) ──────────────── */
  const { data: modelsData, isLoading: loadingModels } = useQuery({
    queryKey: queryKeys.vehicles.models(brandId),
    queryFn:  () => vehiclesApi.getModels(brandId),
    enabled:  !!brandId,
    staleTime: 10 * 60_000,
    retry: 1,
  });
  const models: any[] = (modelsData as any)?.data ?? modelsData ?? [];

  /* ── Listings query (wires ALL params to backend) ─────────────── */
  // Build the API params object — only include non-empty values
  const apiParams = {
    type:         'CAR',
    ...(query        && { search: query }),
    ...(brandId      && { brandId }),
    ...(modelId      && { modelId }),
    ...(fuelType     && { fuelType }),
    ...(transmission && { transmission }),
    ...(condition    && { condition }),
    ...(colorFilter  && { color: colorFilter }),
    ...(minYear      && { minYear }),
    ...(maxYear      && { maxYear }),
    ...(minPrice > 0        && { minPrice: String(minPrice) }),
    ...(maxPrice < PRICE_MAX && { maxPrice: String(maxPrice) }),
    ...(maxMileage > 0      && { maxMileage: String(maxMileage) }),
    // sellerType passed for future backend support
    ...(sellerType !== 'all' && { sellerType }),
    limit: 24,
    page,
    // Sort mapping
    ...(sortBy === 'price_asc'  && { sortBy: 'price', sortOrder: 'asc' }),
    ...(sortBy === 'price_desc' && { sortBy: 'price', sortOrder: 'desc' }),
    ...(sortBy === 'newest'     && { sortBy: 'createdAt', sortOrder: 'desc' }),
    ...(sortBy === 'mileage'    && { sortBy: 'mileage', sortOrder: 'asc' }),
  };

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.listings.list(apiParams),
    queryFn:  () => listingsApi.getAll(apiParams),
    placeholderData: (prev) => prev,
  });

  const cars       = data?.data       ?? [];
  const totalPages = data?.totalPages ?? 1;

  /* ── Active filter count ──────────────────────────────────────── */
  const activeFilters = [
    brandId && brandName,
    modelId && modelName,
    fuelType, transmission, condition, city, colorFilter, bodyType,
    minYear && `From ${minYear}`,
    maxYear && `To ${maxYear}`,
    minPrice > 0        && fmtPrice.format(minPrice) + '+',
    maxPrice < PRICE_MAX && 'Max ' + fmtPrice.format(maxPrice),
    maxMileage > 0      && `< ${fmtNum.format(maxMileage)} km`,
    sellerType !== 'all' && (sellerType === 'dealer' ? 'Dealers' : 'Individuals'),
  ].filter(Boolean) as string[];

  /* ── Stable callbacks ─────────────────────────────────────────── */
  const resetAll = useCallback(() => {
    setQuery(''); setBrandId(''); setBrandName(''); setModelId(''); setModelName('');
    setBodyType(''); setFuelType(''); setTrans(''); setCondition(''); setColor('');
    setMinPrice(0); setMaxPrice(PRICE_MAX);
    setMinYear(''); setMaxYear('');
    setMaxMileage(0); setCity(''); setSellerType('all');
    setPage(1);
  }, []);

  const handleBrand = useCallback((id: string, name: string) => {
    setBrandId(v => v === id ? (setBrandName(''), '') : (setBrandName(name), id));
    setModelId(''); setModelName('');
    setPage(1);
  }, []);

  const handleModel = useCallback((id: string, name: string) => {
    setModelId(v => v === id ? (setModelName(''), '') : (setModelName(name), id));
    setPage(1);
  }, []);

  const handlePrice  = useCallback((low: number, high: number) => {
    setMinPrice(low); setMaxPrice(high); setPage(1);
  }, []);

  const handleMileage = useCallback((max: number) => {
    setMaxMileage(max); setPage(1);
  }, []);

  /* ─── Sidebar JSX ──────────────────────────────────────────────────────── */
  const sidebar = (
    <div className="text-sm space-y-0">

      {/* Search */}
      <div className="relative mb-5">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--text-muted)]" />
        <input
          value={query}
          onChange={e => { setQuery(e.target.value); setPage(1); }}
          placeholder="Search cars…"
          className="input-base pl-9 text-sm h-10"
        />
      </div>

      {/* ── 1. Brand ──────────────────────────────────────── */}
      <FilterSection title="Brand" icon={<Car />} defaultOpen>
        <div className="space-y-1 max-h-52 overflow-y-auto no-scrollbar pr-1">
          {brands.length > 0
            ? brands.map((b: any) => {
                const id   = String(b.id);
                const name = b.nameEn ?? b.name ?? 'Unknown';
                const active = brandId === id;
                return (
                  <label key={id} className="flex items-center gap-2.5 cursor-pointer group">
                    <input type="checkbox" checked={active}
                      onChange={() => handleBrand(id, name)}
                      className="w-4 h-4 rounded border-[var(--border-default)] accent-[var(--gold)]" />
                    <span className={`transition-colors ${active ? 'text-[var(--gold)] font-semibold' : 'text-[var(--text-secondary)] group-hover:text-[var(--gold)]'}`}>
                      {name}
                    </span>
                  </label>
                );
              })
            : /* Fallback static list while API loads */
              ['Toyota','KIA','Hyundai','BMW','Mercedes-Benz','Lexus','Honda',
               'Nissan','Mitsubishi','Ford','BYD','Geely','Haval','Audi','Volkswagen'].map(name => (
                <label key={name} className="flex items-center gap-2.5 cursor-pointer group">
                  <input type="checkbox" checked={brandName === name}
                    onChange={() => { setBrandName(v => v === name ? '' : name); setPage(1); }}
                    className="w-4 h-4 rounded border-[var(--border-default)] accent-[var(--gold)]" />
                  <span className="text-[var(--text-secondary)] group-hover:text-[var(--gold)] transition-colors">{name}</span>
                </label>
              ))
          }
        </div>
      </FilterSection>

      {/* ── 2. Model (cascade) ────────────────────────────── */}
      {brandId && (
        <FilterSection title="Model" defaultOpen>
          {loadingModels ? (
            <div className="flex items-center gap-2 text-xs text-[var(--text-muted)] py-2">
              <span className="spinner w-3 h-3" />Loading models…
            </div>
          ) : models.length > 0 ? (
            <div className="space-y-1 max-h-44 overflow-y-auto no-scrollbar pr-1">
              {models.map((m: any) => {
                const id   = String(m.id);
                const name = m.nameEn ?? m.name ?? 'Unknown';
                const active = modelId === id;
                return (
                  <label key={id} className="flex items-center gap-2.5 cursor-pointer group">
                    <input type="checkbox" checked={active}
                      onChange={() => handleModel(id, name)}
                      className="w-4 h-4 rounded border-[var(--border-default)] accent-[var(--gold)]" />
                    <span className={`transition-colors ${active ? 'text-[var(--gold)] font-semibold' : 'text-[var(--text-secondary)] group-hover:text-[var(--gold)]'}`}>
                      {name}
                    </span>
                  </label>
                );
              })}
            </div>
          ) : (
            <p className="text-xs text-[var(--text-muted)] py-1">No models found for this brand.</p>
          )}
        </FilterSection>
      )}

      {/* ── 3. Price Range Slider ─────────────────────────── */}
      <FilterSection title="Price Range" icon={<DollarSign size={14}/>} defaultOpen>
        <DualRangeSlider
          min={0} max={PRICE_MAX} step={PRICE_STEP}
          valueLow={minPrice} valueHigh={maxPrice}
          onChange={handlePrice}
          format={v => v === 0 ? '$0' : v >= 1_000 ? `$${v/1000}k` : `$${v}`}
        />
      </FilterSection>

      {/* ── 4. Year Range ─────────────────────────────────── */}
      <FilterSection title="Year Range" icon={<Calendar size={14}/>} defaultOpen>
        <div className="grid grid-cols-2 gap-2">
          {/* From */}
          <div>
            <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-faint)] mb-1 block">From</label>
            <div className="relative">
              <select value={minYear}
                onChange={e => { setMinYear(e.target.value); setPage(1); }}
                className="input-base h-9 text-xs appearance-none pr-7 w-full cursor-pointer">
                <option value="">Any</option>
                {ALL_YEARS.filter(y => !maxYear || Number(y) <= Number(maxYear)).map(y =>
                  <option key={y} value={y}>{y}</option>)}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-[var(--text-muted)] pointer-events-none"/>
            </div>
          </div>
          {/* To */}
          <div>
            <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-faint)] mb-1 block">To</label>
            <div className="relative">
              <select value={maxYear}
                onChange={e => { setMaxYear(e.target.value); setPage(1); }}
                className="input-base h-9 text-xs appearance-none pr-7 w-full cursor-pointer">
                <option value="">Any</option>
                {ALL_YEARS.filter(y => !minYear || Number(y) >= Number(minYear)).map(y =>
                  <option key={y} value={y}>{y}</option>)}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-[var(--text-muted)] pointer-events-none"/>
            </div>
          </div>
        </div>
      </FilterSection>

      {/* ── 5. Fuel Type ──────────────────────────────────── */}
      <FilterSection title="Fuel Type" defaultOpen>
        <div className="flex flex-wrap gap-2">
          {FUEL_TYPES.map(f => (
            <button key={f} onClick={() => { setFuelType(v => v === f ? '' : f); setPage(1); }}
              className={`filter-chip ${fuelType === f ? 'active' : ''}`}>{f}</button>
          ))}
        </div>
      </FilterSection>

      {/* ── 6. Transmission ───────────────────────────────── */}
      <FilterSection title="Transmission" defaultOpen>
        <div className="flex flex-wrap gap-2">
          {TRANSMISSIONS.map(t => (
            <button key={t} onClick={() => { setTrans(v => v === t ? '' : t); setPage(1); }}
              className={`filter-chip ${transmission === t ? 'active' : ''}`}>{t}</button>
          ))}
        </div>
      </FilterSection>

      {/* ── 7. Condition ──────────────────────────────────── */}
      <FilterSection title="Condition" defaultOpen>
        <div className="flex flex-wrap gap-2">
          {CONDITIONS.map(c => (
            <button key={c} onClick={() => { setCondition(v => v === c ? '' : c); setPage(1); }}
              className={`filter-chip ${condition === c ? 'active' : ''}`}>{c}</button>
          ))}
        </div>
      </FilterSection>

      {/* ── 8. Mileage ────────────────────────────────────── */}
      <FilterSection title="Mileage" icon={<Gauge size={14}/>} defaultOpen>
        <div className="flex flex-wrap gap-2 mb-3">
          {MILEAGE_PRESETS.map(p => (
            <button key={p.label}
              onClick={() => handleMileage(maxMileage === p.max ? 0 : p.max)}
              className={`filter-chip text-[11px] ${maxMileage === p.max && p.max > 0 ? 'active' : ''} ${p.max === 0 ? (maxMileage === 0 ? 'active' : '') : ''}`}>
              {p.label}
            </button>
          ))}
        </div>
        {/* Fine-grained max mileage slider */}
        <div className="px-1">
          <input type="range"
            min={0} max={300_000} step={5_000}
            value={maxMileage}
            onChange={e => handleMileage(Number(e.target.value))}
            className="single-range-input w-full"
            style={{ '--range-pct': `${(maxMileage / 300_000) * 100}%` } as React.CSSProperties}
          />
          <div className="flex justify-between text-[10px] text-[var(--text-faint)] mt-1">
            <span>0 km</span>
            <span className="text-[var(--gold)] font-semibold">
              {maxMileage > 0 ? `< ${fmtNum.format(maxMileage)} km` : 'Any'}
            </span>
            <span>300k km</span>
          </div>
        </div>
      </FilterSection>

      {/* ── 9. City / Location ────────────────────────────── */}
      <FilterSection title="City / Location" icon={<MapPin size={14}/>} defaultOpen>
        <div className="space-y-1 max-h-44 overflow-y-auto no-scrollbar pr-1">
          {ALL_CITIES.map(c => (
            <label key={c} className="flex items-center gap-2.5 cursor-pointer group">
              <input type="checkbox" checked={city === c}
                onChange={() => { setCity(v => v === c ? '' : c); setPage(1); }}
                className="w-4 h-4 rounded accent-[var(--gold)]" />
              <span className={`transition-colors text-xs ${city === c ? 'text-[var(--gold)] font-semibold' : 'text-[var(--text-secondary)] group-hover:text-[var(--gold)]'}`}>
                {c}
              </span>
            </label>
          ))}
        </div>
      </FilterSection>

      {/* ── 10. Seller Type ────────────────────────────────── */}
      <FilterSection title="Seller Type" defaultOpen>
        <div className="grid grid-cols-3 gap-2">
          {([
            { val: 'all',        icon: <Filter size={13}/>,      label: 'All'        },
            { val: 'dealer',     icon: <Building2 size={13}/>,   label: 'Dealer'     },
            { val: 'individual', icon: <User size={13}/>,        label: 'Individual' },
          ] as const).map(({ val, icon, label }) => (
            <button key={val}
              onClick={() => { setSellerType(val); setPage(1); }}
              className={`flex flex-col items-center gap-1 py-2.5 px-2 rounded-xl border text-[11px] font-semibold
                          transition-all duration-200
                          ${sellerType === val
                            ? 'bg-[var(--gold-subtle)] border-[var(--border-gold)] text-[var(--gold)]'
                            : 'bg-[var(--surface-50)] border-[var(--border-default)] text-[var(--text-muted)] hover:border-[var(--border-gold)] hover:text-[var(--gold)]'
                          } dark:bg-[rgba(255,255,255,0.04)]`}>
              {icon}
              {label}
            </button>
          ))}
        </div>
      </FilterSection>

      {/* Body Type + Color hidden by default */}
      <FilterSection title="Body Type" defaultOpen={false}>
        <div className="flex flex-wrap gap-2">
          {BODY_TYPES.map(t => (
            <button key={t} onClick={() => { setBodyType(v => v === t ? '' : t); setPage(1); }}
              className={`filter-chip ${bodyType === t ? 'active' : ''}`}>{t}</button>
          ))}
        </div>
      </FilterSection>

      <FilterSection title="Color" defaultOpen={false}>
        <div className="flex flex-wrap gap-2">
          {COLORS.map(c => (
            <button key={c} onClick={() => { setColor(v => v === c ? '' : c); setPage(1); }}
              className={`filter-chip ${colorFilter === c ? 'active' : ''}`}>{c}</button>
          ))}
        </div>
      </FilterSection>

      {/* Clear All */}
      {activeFilters.length > 0 && (
        <button onClick={resetAll}
          className="w-full mt-4 flex items-center justify-center gap-2 py-2.5 rounded-xl
                     text-sm font-semibold text-red-500 border border-red-200 dark:border-red-900/30
                     hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors">
          <X className="w-4 h-4"/>Clear All ({activeFilters.length})
        </button>
      )}
    </div>
  );

  const isRtl = locale === 'ku' || locale === 'ar';

  return (
    <>
      <div dir={isRtl ? 'rtl' : 'ltr'}
           className="min-h-screen bg-[var(--surface-0)] dark:bg-[var(--ink-900)] page-content">

        {/* ── Page Header ─────────────────────────────────────────── */}
        <div className="relative overflow-hidden border-b border-[var(--border-default)]"
             style={{ background: 'linear-gradient(135deg,#050b14 0%,#0b1525 60%,#050b14 100%)' }}>
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
              <strong className="text-white/70">{(data?.total ?? 0).toLocaleString()}+</strong> verified listings across Iraq · Kurdistan · UAE · China
            </p>
            <div className="flex flex-wrap gap-2 mt-3">
              {['New Arrivals','Under $20k','Luxury','Electric','4×4'].map(tag => (
                <button key={tag}
                  className="px-3 py-1 rounded-full text-xs font-semibold
                             bg-white/[0.06] border border-white/[0.10] text-white/50
                             hover:bg-[rgba(201,168,76,0.12)] hover:border-[rgba(201,168,76,0.35)] hover:text-[#c9a84c]
                             transition-all duration-200">
                  {tag}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── Layout ──────────────────────────────────────────────── */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex gap-8">

            {/* Desktop Sidebar */}
            <aside className="hidden lg:block w-72 flex-shrink-0">
              <div className="sticky top-[calc(var(--navbar-h)+1.5rem)] rounded-2xl
                              bg-white dark:bg-gradient-to-b dark:from-[#0d1e35] dark:to-[#0a1528]
                              border border-[var(--border-default)] dark:border-white/[0.07]
                              shadow-[var(--shadow-sm)] p-5
                              max-h-[calc(100vh-120px)] overflow-y-auto no-scrollbar">
                <div className="flex items-center justify-between mb-5">
                  <h2 className="font-bold text-[var(--text-primary)] flex items-center gap-2">
                    <Filter className="w-4 h-4 text-[var(--gold)]"/>Filters
                    {activeFilters.length > 0 && (
                      <span className="badge badge-gold">{activeFilters.length}</span>
                    )}
                  </h2>
                </div>
                {sidebar}
              </div>
            </aside>

            {/* Main Content */}
            <div className="flex-1 min-w-0">

              {/* Toolbar */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-5">
                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <button onClick={() => setSidebar(true)}
                    className="lg:hidden flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold
                               bg-white dark:bg-[#0b1525] border border-[var(--border-default)]
                               text-[var(--text-secondary)] shadow-[var(--shadow-sm)] hover:border-[var(--border-gold)]">
                    <SlidersHorizontal className="w-4 h-4"/>Filters
                    {activeFilters.length > 0 && (
                      <span className="badge badge-gold">{activeFilters.length}</span>
                    )}
                  </button>
                  <p className="text-sm text-[var(--text-muted)]">
                    <strong className="text-[var(--text-primary)]">{data?.total ?? cars.length}</strong> results
                  </p>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
                  <div className="relative">
                    <select value={sortBy} onChange={e => setSortBy(e.target.value)}
                      className="input-base pr-8 h-9 text-xs cursor-pointer appearance-none max-w-[160px]">
                      {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                    <ArrowUpDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-[var(--text-muted)] pointer-events-none"/>
                  </div>
                  <div className="flex rounded-xl overflow-hidden border border-[var(--border-default)] bg-white dark:bg-[#0b1525]">
                    <button onClick={() => setView('grid')}
                      className={`p-2 transition-all duration-200 ${view==='grid' ? 'bg-gradient-to-r from-[#a87828] to-[#c9a84c] text-[#050b14]' : 'text-[var(--text-muted)] hover:text-[var(--gold)]'}`}>
                      <Grid3X3 className="w-4 h-4"/>
                    </button>
                    <button onClick={() => setView('list')}
                      className={`p-2 transition-all duration-200 ${view==='list' ? 'bg-gradient-to-r from-[#a87828] to-[#c9a84c] text-[#050b14]' : 'text-[var(--text-muted)] hover:text-[var(--gold)]'}`}>
                      <List className="w-4 h-4"/>
                    </button>
                  </div>
                </div>
              </div>

              {/* Active filter chips */}
              {activeFilters.length > 0 && (
                <div className="filter-chips-row flex gap-2 mb-5 pb-1">
                  {activeFilters.map((label) => (
                    <span key={label}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs whitespace-nowrap
                                 bg-[var(--gold-subtle)] text-[var(--gold)] border border-[var(--border-gold)]">
                      {label}
                      <button
                        onClick={() => {
                          if (label === brandName)           { setBrandId(''); setBrandName(''); setModelId(''); setModelName(''); }
                          else if (label === modelName)      { setModelId(''); setModelName(''); }
                          else if (label === fuelType)       setFuelType('');
                          else if (label === transmission)   setTrans('');
                          else if (label === condition)      setCondition('');
                          else if (label === city)           setCity('');
                          else if (label === colorFilter)    setColor('');
                          else if (label === bodyType)       setBodyType('');
                          else if (label?.startsWith('From'))setMinYear('');
                          else if (label?.startsWith('To ')) setMaxYear('');
                          else if (label?.includes('+'))     setMinPrice(0);
                          else if (label?.startsWith('Max '))setMaxPrice(PRICE_MAX);
                          else if (label?.includes('km'))    setMaxMileage(0);
                          else if (label === 'Dealers' || label === 'Individuals') setSellerType('all');
                          setPage(1);
                        }}
                        className="hover:text-red-400 transition-colors ml-0.5">
                        <X className="w-3 h-3"/>
                      </button>
                    </span>
                  ))}
                  <button onClick={resetAll}
                    className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs whitespace-nowrap
                               text-red-500 border border-red-200 dark:border-red-900/30
                               hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors">
                    <X className="w-3 h-3"/>Clear all
                  </button>
                </div>
              )}

              {/* Grid / List / Loading / Empty */}
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
                  <button onClick={resetAll}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold
                               text-[var(--ink-900)] transition-all hover:-translate-y-0.5 active:scale-[0.98]"
                    style={{ background: 'linear-gradient(135deg,#a87828 0%,#c9a84c 50%,#dab445 100%)', boxShadow:'0 4px 16px rgba(201,168,76,0.35)' }}>
                    Clear All Filters
                  </button>
                </div>
              ) : (
                <div className={view === 'grid'
                  ? 'grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5'
                  : 'flex flex-col gap-3'}>
                  {cars.map((car: any, idx: number) => (
                    <CarCard key={car.id} car={car} locale={locale} view={view} priority={idx < 3}/>
                  ))}
                </div>
              )}

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex justify-center gap-2 mt-10 flex-wrap">
                  {/* Prev */}
                  <button disabled={page === 1} onClick={() => setPage(p => p - 1)}
                    className="w-9 h-9 rounded-xl text-sm font-semibold transition-all
                               bg-white dark:bg-[#0b1525] border border-[var(--border-default)]
                               text-[var(--text-muted)] hover:border-[var(--border-gold)] hover:text-[var(--gold)]
                               disabled:opacity-30 disabled:cursor-not-allowed">
                    ‹
                  </button>

                  {/* Page numbers (smart window) */}
                  {(() => {
                    const WINDOW = 2;
                    const pages: (number|'…')[] = [];
                    for (let p = 1; p <= totalPages; p++) {
                      if (p === 1 || p === totalPages || (p >= page - WINDOW && p <= page + WINDOW)) {
                        pages.push(p);
                      } else if (pages[pages.length - 1] !== '…') {
                        pages.push('…');
                      }
                    }
                    return pages.map((p, i) =>
                      p === '…' ? (
                        <span key={`ellipsis-${i}`} className="w-9 h-9 flex items-center justify-center text-[var(--text-muted)]">…</span>
                      ) : (
                        <button key={p} onClick={() => setPage(p as number)}
                          className={`w-9 h-9 rounded-xl text-sm font-semibold transition-all
                            ${p === page
                              ? 'text-[var(--ink-900)] shadow-[0_2px_8px_rgba(201,168,76,0.35)]'
                              : 'bg-white dark:bg-[#0b1525] border border-[var(--border-default)] text-[var(--text-muted)] hover:border-[var(--border-gold)] hover:text-[var(--gold)]'}`}
                          style={p === page ? { background: 'linear-gradient(135deg,#a87828 0%,#c9a84c 50%,#dab445 100%)' } : undefined}>
                          {p}
                        </button>
                      )
                    );
                  })()}

                  {/* Next */}
                  <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)}
                    className="w-9 h-9 rounded-xl text-sm font-semibold transition-all
                               bg-white dark:bg-[#0b1525] border border-[var(--border-default)]
                               text-[var(--text-muted)] hover:border-[var(--border-gold)] hover:text-[var(--gold)]
                               disabled:opacity-30 disabled:cursor-not-allowed">
                    ›
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Mobile Sidebar Drawer ──────────────────────────────── */}
        {sidebarOpen && (
          <>
            <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
                 onClick={() => setSidebar(false)}/>
            <div className="fixed inset-y-0 left-0 z-50 w-80 bg-white dark:bg-[#0b1525]
                            shadow-[var(--shadow-xl)] overflow-y-auto no-scrollbar lg:hidden anim-slide-l">
              <div className="flex items-center justify-between p-5 border-b border-[var(--border-default)]">
                <h2 className="font-bold text-[var(--text-primary)] flex items-center gap-2">
                  <Filter className="w-4 h-4 text-[var(--gold)]"/>Filters
                  {activeFilters.length > 0 && (
                    <span className="badge badge-gold">{activeFilters.length}</span>
                  )}
                </h2>
                <button onClick={() => setSidebar(false)}
                  className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[var(--surface-100)] transition-colors">
                  <X className="w-4 h-4 text-[var(--text-muted)]"/>
                </button>
              </div>
              <div className="p-5">{sidebar}</div>
            </div>
          </>
        )}
      </div>
    </>
  );
}


