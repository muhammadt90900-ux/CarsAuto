// apps/web/src/app/[locale]/(public)/cars/page.tsx
'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { Search, SlidersHorizontal, X, ChevronDown } from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL;

const BODY_TYPES    = ['Sedan', 'SUV', 'Hatchback', 'Pickup Truck', 'Coupe', 'Convertible', 'Van / MPV', 'Crossover', 'Wagon / Estate', 'Minivan'];
const FUEL_TYPES    = ['Gasoline', 'Diesel', 'Hybrid', 'Plug-in Hybrid', 'Electric', 'LPG', 'CNG'];
const TRANSMISSIONS = ['Automatic', 'Manual', 'CVT', 'DCT / Dual-Clutch', 'Semi-Automatic'];
const DRIVE_TYPES   = ['FWD', 'RWD', 'AWD', '4WD / 4x4', 'Part-time 4WD'];
const CONDITIONS    = ['NEW', 'USED', 'SALVAGE'];
const YEARS         = Array.from({ length: 36 }, (_, i) => String(2025 - i));

// ── tiny helpers ──────────────────────────────────────────────────────────────
function Select({ label, value, onChange, options, disabled = false }: any) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{label}</label>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className="w-full appearance-none bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl px-3 py-2.5 text-sm text-gray-800 dark:text-gray-200 pr-8 disabled:opacity-40 focus:outline-none focus:ring-2 focus:ring-[#e94560]/30 focus:border-[#e94560]/50 transition-all"
        >
          <option value="">All</option>
          {options.map((o: any) => (
            <option key={typeof o === 'object' ? o.value : o} value={typeof o === 'object' ? o.value : o}>
              {typeof o === 'object' ? o.label : o}
            </option>
          ))}
        </select>
        <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
      </div>
    </div>
  );
}

function CarCard({ listing }: { listing: any }) {
  const cover = listing.images?.[0]?.url;
  const title = listing.titleEn ?? listing.titleKu ?? listing.titleAr;
  const make  = listing.carMake?.nameEn ?? '';
  const model = listing.carModel?.name  ?? '';

  return (
    <Link href={`cars/${listing.id}`} className="group block bg-white dark:bg-[#0f0f1a]/80 rounded-2xl border border-gray-100 dark:border-white/5 overflow-hidden hover:shadow-xl hover:shadow-black/5 dark:hover:shadow-black/40 hover:-translate-y-1 transition-all duration-300">
      {/* Image */}
      <div className="relative h-44 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-white/5 dark:to-white/10 overflow-hidden">
        {cover
          ? <img src={cover} alt={title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
          : <div className="w-full h-full flex items-center justify-center text-5xl opacity-20">🚗</div>
        }
        {listing.carMake?.logoUrl && (
          <img src={listing.carMake.logoUrl} alt={make} className="absolute bottom-2 right-2 h-7 w-14 object-contain bg-white/80 dark:bg-black/60 rounded-lg px-1 backdrop-blur-sm" />
        )}
        <div className="absolute top-2 left-2">
          {listing.condition && (
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full backdrop-blur-sm border ${listing.condition === 'NEW' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-amber-500/20 text-amber-400 border-amber-500/30'}`}>
              {listing.condition}
            </span>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-2">
        <div>
          <p className="text-xs text-gray-400 font-medium">{make} {model}</p>
          <h3 className="font-semibold text-gray-900 dark:text-white text-sm truncate">{title}</h3>
        </div>

        {/* Spec pills */}
        <div className="flex flex-wrap gap-1.5">
          {listing.year        && <span className="text-[11px] bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-gray-400 px-2 py-0.5 rounded-full">{listing.year}</span>}
          {listing.trim        && <span className="text-[11px] bg-[#e94560]/10 text-[#e94560] px-2 py-0.5 rounded-full">{listing.trim}</span>}
          {listing.fuelType    && <span className="text-[11px] bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-gray-400 px-2 py-0.5 rounded-full">{listing.fuelType}</span>}
          {listing.transmission && <span className="text-[11px] bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-gray-400 px-2 py-0.5 rounded-full">{listing.transmission}</span>}
          {listing.mileage     && <span className="text-[11px] bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-gray-400 px-2 py-0.5 rounded-full">{listing.mileage.toLocaleString()} km</span>}
        </div>

        <div className="pt-1 flex items-center justify-between">
          <p className="text-lg font-black text-[#e94560] tracking-tight">
            {listing.price.toLocaleString()} <span className="text-xs font-semibold">{listing.currency}</span>
          </p>
          {listing.location && (
            <p className="text-[11px] text-gray-400 truncate max-w-[120px]">📍 {listing.location.nameEn ?? listing.location.city}</p>
          )}
        </div>
      </div>
    </Link>
  );
}

// ── main page ─────────────────────────────────────────────────────────────────
export default function CarsPage() {
  const [listings, setListings]     = useState<any[]>([]);
  const [makes, setMakes]           = useState<any[]>([]);
  const [models, setModels]         = useState<any[]>([]);
  const [trims, setTrims]           = useState<string[]>([]);
  const [total, setTotal]           = useState(0);
  const [page, setPage]             = useState(1);
  const [loading, setLoading]       = useState(true);
  const [sidebarOpen, setSidebar]   = useState(false);

  const [filters, setFilters] = useState({
    makeId: '', modelId: '', yearFrom: '', yearTo: '', trim: '',
    bodyType: '', fuelType: '', transmission: '', driveType: '', condition: '',
    minPrice: '', maxPrice: '', minMileage: '', maxMileage: '',
  });

  const setFilter = (key: string, val: string) => {
    setFilters((prev) => {
      const next = { ...prev, [key]: val };
      if (key === 'makeId')  { next.modelId = ''; next.trim = ''; }
      if (key === 'modelId') { next.trim = ''; }
      return next;
    });
    setPage(1);
  };

  // load makes once
  useEffect(() => {
    fetch(`${API}/listings/makes`)
      .then((r) => r.json())
      .then(setMakes)
      .catch(() => {});
  }, []);

  // load models when make changes
  useEffect(() => {
    if (!filters.makeId) { setModels([]); return; }
    fetch(`${API}/listings/makes/${filters.makeId}/models`)
      .then((r) => r.json())
      .then(setModels)
      .catch(() => {});
  }, [filters.makeId]);

  // load trims when model/year changes
  useEffect(() => {
    if (!filters.modelId) { setTrims([]); return; }
    const yr = filters.yearFrom ? `?year=${filters.yearFrom}` : '';
    fetch(`${API}/listings/models/${filters.modelId}/trims${yr}`)
      .then((r) => r.json())
      .then(setTrims)
      .catch(() => {});
  }, [filters.modelId, filters.yearFrom]);

  // fetch listings
  const fetchListings = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams({ type: 'CAR', page: String(page), limit: '20' });
    Object.entries(filters).forEach(([k, v]) => { if (v) params.set(k, v); });
    fetch(`${API}/listings?${params}`)
      .then((r) => r.json())
      .then((d) => { setListings(d.data ?? []); setTotal(d.total ?? 0); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [filters, page]);

  useEffect(() => { fetchListings(); }, [fetchListings]);

  const activeFilterCount = Object.values(filters).filter(Boolean).length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* ── Top bar ── */}
      <div className="flex items-center justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Cars for Sale</h1>
          <p className="text-sm text-gray-500 mt-0.5">{total.toLocaleString()} listings found</p>
        </div>
        <button
          onClick={() => setSidebar(!sidebarOpen)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/10 transition-colors relative"
        >
          <SlidersHorizontal className="w-4 h-4" />
          Filters
          {activeFilterCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-[#e94560] text-white text-[10px] font-bold rounded-full flex items-center justify-center">
              {activeFilterCount}
            </span>
          )}
        </button>
      </div>

      <div className="flex gap-6">
        {/* ── Sidebar ── */}
        <aside className={`flex-shrink-0 w-72 transition-all duration-300 ${sidebarOpen ? 'block' : 'hidden lg:block'}`}>
          <div className="bg-white dark:bg-[#0f0f1a]/80 border border-gray-100 dark:border-white/5 rounded-2xl p-5 space-y-4 sticky top-24">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-gray-900 dark:text-white">Filter</h2>
              {activeFilterCount > 0 && (
                <button
                  onClick={() => { setFilters({ makeId: '', modelId: '', yearFrom: '', yearTo: '', trim: '', bodyType: '', fuelType: '', transmission: '', driveType: '', condition: '', minPrice: '', maxPrice: '', minMileage: '', maxMileage: '' }); setPage(1); }}
                  className="text-xs text-[#e94560] hover:underline flex items-center gap-1"
                >
                  <X className="w-3 h-3" /> Clear all
                </button>
              )}
            </div>

            {/* Brand */}
            <Select
              label="Brand"
              value={filters.makeId}
              onChange={(v: string) => setFilter('makeId', v)}
              options={makes.map((m) => ({ value: m.id, label: m.nameEn }))}
            />

            {/* Model — cascades from brand */}
            <Select
              label="Model"
              value={filters.modelId}
              onChange={(v: string) => setFilter('modelId', v)}
              options={models.map((m) => ({ value: m.id, label: m.name }))}
              disabled={!filters.makeId}
            />

            {/* Year range */}
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Year</label>
              <div className="flex gap-2">
                <Select label="" value={filters.yearFrom} onChange={(v: string) => setFilter('yearFrom', v)} options={YEARS.slice().reverse()} />
                <Select label="" value={filters.yearTo}   onChange={(v: string) => setFilter('yearTo', v)}   options={YEARS} />
              </div>
            </div>

            {/* Trim — cascades from model */}
            <Select
              label="Trim"
              value={filters.trim}
              onChange={(v: string) => setFilter('trim', v)}
              options={trims}
              disabled={!filters.modelId}
            />

            <Select label="Body Type"    value={filters.bodyType}     onChange={(v: string) => setFilter('bodyType', v)}     options={BODY_TYPES} />
            <Select label="Fuel Type"    value={filters.fuelType}     onChange={(v: string) => setFilter('fuelType', v)}     options={FUEL_TYPES} />
            <Select label="Transmission" value={filters.transmission} onChange={(v: string) => setFilter('transmission', v)} options={TRANSMISSIONS} />
            <Select label="Drivetrain"   value={filters.driveType}    onChange={(v: string) => setFilter('driveType', v)}    options={DRIVE_TYPES} />
            <Select label="Condition"    value={filters.condition}    onChange={(v: string) => setFilter('condition', v)}    options={CONDITIONS} />

            {/* Price range */}
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Price (USD)</label>
              <div className="flex gap-2">
                <input type="number" placeholder="Min" value={filters.minPrice} onChange={(e) => setFilter('minPrice', e.target.value)} className="w-full text-sm px-3 py-2 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-[#e94560]/30" />
                <input type="number" placeholder="Max" value={filters.maxPrice} onChange={(e) => setFilter('maxPrice', e.target.value)} className="w-full text-sm px-3 py-2 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-[#e94560]/30" />
              </div>
            </div>

            {/* Mileage range */}
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Mileage (km)</label>
              <div className="flex gap-2">
                <input type="number" placeholder="Min" value={filters.minMileage} onChange={(e) => setFilter('minMileage', e.target.value)} className="w-full text-sm px-3 py-2 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-[#e94560]/30" />
                <input type="number" placeholder="Max" value={filters.maxMileage} onChange={(e) => setFilter('maxMileage', e.target.value)} className="w-full text-sm px-3 py-2 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-[#e94560]/30" />
              </div>
            </div>
          </div>
        </aside>

        {/* ── Grid ── */}
        <div className="flex-1 min-w-0">
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {[...Array(9)].map((_, i) => (
                <div key={i} className="h-64 bg-gray-100 dark:bg-white/5 rounded-2xl animate-pulse" />
              ))}
            </div>
          ) : listings.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <div className="text-6xl mb-4">🚗</div>
              <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-1">No cars found</h3>
              <p className="text-sm text-gray-400">Try adjusting your filters</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {listings.map((l) => <CarCard key={l.id} listing={l} />)}
              </div>

              {/* Pagination */}
              {total > 20 && (
                <div className="flex justify-center gap-2 mt-8">
                  <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="px-4 py-2 rounded-xl border border-gray-200 dark:border-white/10 text-sm font-semibold disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                    Previous
                  </button>
                  <span className="px-4 py-2 text-sm text-gray-500">Page {page} of {Math.ceil(total / 20)}</span>
                  <button disabled={page >= Math.ceil(total / 20)} onClick={() => setPage(p => p + 1)} className="px-4 py-2 rounded-xl border border-gray-200 dark:border-white/10 text-sm font-semibold disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                    Next
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
