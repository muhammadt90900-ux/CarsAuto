'use client';
// components/features/marketplace/ListingTypeClient.tsx
//
// Generic marketplace grid/filter/pagination shell shared by the ACCESSORY
// and SERVICE listing types (apps/web/src/app/[locale]/(public)/accessories
// and .../services both render this with a different config object).
//
// ARCHITECTURE NOTE (Prompt 2): ACCESSORY and SERVICE share the exact same
// backend spec model (ListingAccessorySpec) and the exact same generic
// /listings?type=… endpoint, and differ only in *which* filter fields are
// meaningful (repair type/mobile for services; brand/color/material for
// accessories, informational only — see accessoryFilters.ts). That's a
// small, well-contained difference, so one generic component driven by a
// small config object was the right call here.
//
// This deliberately does NOT try to also unify with CarsMarketplaceClient.tsx
// or SparePartsClient.tsx — those pages have materially different domain
// logic (year/mileage/fuel-type ranges, make→model cascades, dedicated
// CarCard/PartCard visual treatments) and folding them into this shell
// would be a much larger, riskier refactor than what Prompt 2 asked for.

import { useCallback, useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import {
  Search, SlidersHorizontal, X, Grid3X3, List, Filter,
  ChevronDown, ChevronUp, Shield, MapPin,
} from 'lucide-react';
import { listingsApi } from '@/lib/api';
import { queryKeys } from '@/lib/queryKeys';
import { SkeletonCard } from '@/components/ui/Skeleton';

// ── Config contract ─────────────────────────────────────────────────────────

export interface FilterFieldConfig {
  /** Query-param name sent to /listings AND the local state key. */
  key: string;
  label: string;
  kind: 'radio' | 'toggle';
  options?: { value: string; label: string }[];
  /** Used only for kind: 'toggle' */
  toggleLabel?: string;
}

export interface ListingTypeConfig {
  listingType: 'ACCESSORY' | 'SERVICE';
  routeSegment: string;
  titleKu: string;
  titleEn: string;
  emptyIcon: string;
  cardIcon: string;
  /** Server-side-functional filters only — see accessoryFilters.ts / serviceFilters.ts */
  filters: FilterFieldConfig[];
  /** Spec fields rendered on the card as informational chips (not filterable). */
  displayFields: string[];
}

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest First' },
  { value: 'price_asc', label: 'Price: Low → High' },
  { value: 'price_desc', label: 'Price: High → Low' },
];

const fmtPrice = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});

function FilterSection({
  title,
  children,
  defaultOpen = true,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-[var(--border-subtle)] pb-4 mb-4">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center justify-between w-full text-sm font-bold text-[var(--text-primary)] mb-3"
      >
        {title}
        {open ? <ChevronUp className="w-4 h-4 text-[var(--text-muted)]" /> : <ChevronDown className="w-4 h-4 text-[var(--text-muted)]" />}
      </button>
      <div className={`overflow-hidden transition-all duration-300 ${open ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}>
        {children}
      </div>
    </div>
  );
}

function ListingCard({
  listing,
  config,
  view,
}: {
  listing: any;
  config: ListingTypeConfig;
  view: 'grid' | 'list';
}) {
  const title = listing.title?.en ?? listing.titleEn ?? listing.title ?? '';
  const spec = listing.accessorySpec ?? listing;
  const chips: string[] = config.displayFields
    .map((f) => {
      const v = spec?.[f];
      if (v === null || v === undefined || v === '' || (Array.isArray(v) && v.length === 0)) return null;
      if (f === 'mobile') return v ? 'Mobile service' : null;
      if (Array.isArray(v)) return v.join(', ');
      return String(v);
    })
    .filter((v): v is string => Boolean(v))
    .slice(0, 4);

  if (view === 'list') {
    return (
      <Link href={`/${config.routeSegment}/${listing.id}`} className="block group">
        <article className="card-premium flex gap-4 p-4 dark:bg-gradient-to-r dark:from-[#0d1e35] dark:to-[#0a1528] dark:hover:border-[rgba(201,168,76,0.28)]">
          <div className="flex-shrink-0 w-28 h-24 rounded-xl overflow-hidden bg-slate-100 dark:bg-[var(--ink-700)] flex items-center justify-center text-4xl">
            {config.cardIcon}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="font-bold text-[var(--text-primary)] leading-tight">{title}</h3>
              </div>
              <span
                className="price-tag text-xl flex-shrink-0"
                style={{ background: 'linear-gradient(135deg, var(--gold-bright) 0%, var(--gold) 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}
              >
                {fmtPrice.format(listing.price ?? 0)}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-[var(--text-muted)]">
              {chips.map((c) => (
                <span key={c} className="badge badge-gold">{c}</span>
              ))}
              {listing.locationName && (
                <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{listing.locationName}</span>
              )}
            </div>
          </div>
        </article>
      </Link>
    );
  }

  return (
    <Link href={`/${config.routeSegment}/${listing.id}`} className="block group">
      <article className="card-premium overflow-hidden h-full flex flex-col dark:bg-gradient-to-b dark:from-[#0d1e35] dark:to-[#0a1528]">
        <div className="aspect-square bg-slate-50 dark:bg-[var(--ink-700)] flex items-center justify-center text-6xl group-hover:scale-105 transition-transform duration-500 overflow-hidden">
          {config.cardIcon}
        </div>
        <div className="p-4 flex flex-col flex-1">
          <h3 className="font-semibold text-sm text-[var(--text-primary)] line-clamp-2 mb-2 leading-snug">{title}</h3>
          <div className="flex flex-wrap gap-1.5 mb-auto">
            {chips.map((c) => (
              <span key={c} className="badge badge-gold">{c}</span>
            ))}
          </div>
          <div className="pt-3 mt-3 border-t border-[var(--border-subtle)] flex items-center justify-between">
            <span
              className="price-tag text-lg"
              style={{ background: 'linear-gradient(135deg, var(--gold-bright) 0%, var(--gold) 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}
            >
              {fmtPrice.format(listing.price ?? 0)}
            </span>
            {listing.verified && <span className="verified-badge"><Shield className="w-2.5 h-2.5" />Verified</span>}
          </div>
        </div>
      </article>
    </Link>
  );
}

export function ListingTypeClient({
  locale,
  initialSearch,
  config,
}: {
  locale: string;
  initialSearch: Record<string, string>;
  config: ListingTypeConfig;
}) {
  const [query, setQuery] = useState(initialSearch.search ?? '');
  const [sort, setSort] = useState(initialSearch.sort ?? 'newest');
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [page, setPage] = useState(1);

  // Dynamic filter state — one entry per config.filters[i].key.
  const [filterValues, setFilterValues] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    for (const f of config.filters) initial[f.key] = initialSearch[f.key] ?? '';
    return initial;
  });

  const setFilter = useCallback((key: string, value: string) => {
    setFilterValues((v) => ({ ...v, [key]: value }));
    setPage(1);
  }, []);

  const resetAll = useCallback(() => {
    setFilterValues((v) => Object.fromEntries(Object.keys(v).map((k) => [k, ''])));
    setPage(1);
  }, []);

  const sortByParam = sort === 'price_asc' || sort === 'price_desc' ? 'price' : 'createdAt';
  const sortOrderParam = sort === 'price_desc' ? 'desc' : sort === 'price_asc' ? 'asc' : 'desc';

  const queryParams = {
    type: config.listingType,
    search: query || undefined,
    sortBy: sortByParam,
    sortOrder: sortOrderParam,
    page,
    limit: 24,
    ...filterValues,
  };

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.listings.list(queryParams),
    queryFn: () => listingsApi.getAll(queryParams),
    placeholderData: (prev) => prev,
  });

  const listings = data?.data ?? [];
  // ListingListResponse is a discriminated union (cursor-paginated vs
  // offset-paginated) — only the offset-paginated shape has `totalPages`,
  // so narrow with an `in` check rather than assuming it's always present
  // (see PROMPT 1 audit note about the same drift in CarsMarketplaceClient).
  const totalPages = data && 'totalPages' in data ? data.totalPages : 1;

  const activeCount = Object.values(filterValues).filter(Boolean).length;

  const SidebarContent = () => (
    <div className="text-sm">
      <div className="relative mb-5">
        <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--text-muted)]" />
        <input
          value={query}
          onChange={(e) => { setQuery(e.target.value); setPage(1); }}
          placeholder={`Search ${config.titleEn.toLowerCase()}…`}
          className="input-base ps-9 h-10"
        />
      </div>

      {config.filters.map((f) =>
        f.kind === 'radio' ? (
          <FilterSection key={f.key} title={f.label}>
            <div className="space-y-1.5">
              {f.options?.map((o) => (
                <label key={o.value} className="flex items-center gap-2.5 cursor-pointer group">
                  <input
                    type="radio"
                    name={f.key}
                    checked={filterValues[f.key] === o.value}
                    onChange={() => setFilter(f.key, filterValues[f.key] === o.value ? '' : o.value)}
                    className="w-4 h-4 accent-[var(--gold)]"
                  />
                  <span className="text-[var(--text-secondary)] group-hover:text-[var(--gold)] transition-colors">
                    {o.label}
                  </span>
                </label>
              ))}
            </div>
          </FilterSection>
        ) : (
          <FilterSection key={f.key} title={f.label}>
            <label className="flex items-center gap-2.5 cursor-pointer group">
              <input
                type="checkbox"
                checked={filterValues[f.key] === 'true'}
                onChange={() => setFilter(f.key, filterValues[f.key] === 'true' ? '' : 'true')}
                className="w-4 h-4 rounded accent-[var(--gold)]"
              />
              <span className="text-[var(--text-secondary)] group-hover:text-[var(--gold)] transition-colors">
                {f.toggleLabel ?? f.label}
              </span>
            </label>
          </FilterSection>
        ),
      )}

      {activeCount > 0 && (
        <button
          onClick={resetAll}
          className="w-full mt-2 flex items-center justify-center gap-2 py-2.5 rounded-xl
                     text-sm font-semibold text-red-500 border border-red-200 dark:border-red-900/30
                     hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors"
        >
          <X className="w-4 h-4" />Clear All
        </button>
      )}
    </div>
  );

  const isRtl = locale === 'ku' || locale === 'ar';

  return (
    <div dir={isRtl ? 'rtl' : 'ltr'} className="min-h-screen bg-[var(--surface-0)] dark:bg-[var(--ink-900)]">
      <div
        className="relative overflow-hidden border-b border-[var(--border-default)]"
        style={{ background: 'linear-gradient(135deg, var(--ink-900) 0%, var(--ink-750) 60%, var(--ink-900) 100%)' }}
      >
        <div className="absolute inset-0 opacity-[0.025] bg-dot-grid" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <nav className="flex items-center gap-2 text-xs text-white/40 mb-4">
            <Link href="/" className="hover:text-[var(--gold)] transition-colors">Home</Link>
            <span>/</span><span className="text-white/60">{config.titleEn}</span>
          </nav>
          <h1 className="text-3xl sm:text-4xl font-display font-black text-white mb-2">
            {config.titleKu} / <span className="text-[var(--gold)]">{config.titleEn}</span>
          </h1>
          <p className="text-white/45 text-sm">{listings.length}+ listings from verified sellers</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex gap-8">
          <aside className="hidden lg:block w-64 flex-shrink-0">
            <div
              className="sticky top-[calc(var(--navbar-h)+1.5rem)] rounded-2xl
                         bg-white dark:bg-[var(--ink-750)] border border-[var(--border-default)]
                         shadow-[var(--shadow-sm)] p-5 max-h-[calc(100vh-120px)] overflow-y-auto no-scrollbar"
            >
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
                <button
                  onClick={() => setSidebarOpen(true)}
                  className="lg:hidden flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold
                             bg-white dark:bg-[var(--ink-750)] border border-[var(--border-default)] shadow-[var(--shadow-sm)]
                             text-[var(--text-secondary)] hover:border-[var(--border-gold)]"
                >
                  <SlidersHorizontal className="w-4 h-4" />Filters
                  {activeCount > 0 && <span className="badge badge-gold">{activeCount}</span>}
                </button>
                <p className="text-sm text-[var(--text-muted)] hidden sm:block">
                  <strong className="text-[var(--text-primary)]">{listings.length}</strong> results
                </p>
              </div>
              <div className="flex items-center gap-2">
                <select value={sort} onChange={(e) => { setSort(e.target.value); setPage(1); }} className="input-base h-9 text-xs w-44">
                  {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
                <div className="flex rounded-xl overflow-hidden border border-[var(--border-default)] bg-white dark:bg-[var(--ink-750)]">
                  {(['grid', 'list'] as const).map((v) => (
                    <button
                      key={v}
                      onClick={() => setView(v)}
                      className={`p-2 transition-colors ${view === v ? 'bg-[var(--gold-subtle)] text-[var(--gold)]' : 'text-[var(--text-muted)] hover:text-[var(--gold)]'}`}
                    >
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
                    <div className="text-5xl mb-4">{config.emptyIcon}</div>
                    <p className="text-[var(--text-muted)] text-sm">
                      No {config.titleEn.toLowerCase()} found. Try different filters.
                    </p>
                  </div>
                ) : (
                  listings.map((listing: any) => (
                    <ListingCard key={listing.id} listing={listing} config={config} view={view} />
                  ))
                )}
              </div>
            )}

            {totalPages > 1 && (
              <div className="flex justify-center gap-2 mt-10">
                {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => i + 1).map((p) => (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={`w-9 h-9 rounded-xl text-sm font-semibold transition-all
                      ${p === page
                        ? 'text-[var(--ink-900)] shadow-gold-sm'
                        : 'bg-white dark:bg-[var(--ink-750)] border border-[var(--border-default)] text-[var(--text-muted)] hover:border-[var(--border-gold)] hover:text-[var(--gold)]'}`}
                    style={p === page ? { background: 'linear-gradient(135deg, #a87828 0%, var(--gold) 50%, #dab445 100%)' } : undefined}
                  >
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
          <div className="fixed inset-y-0 start-0 z-50 w-80 bg-white dark:bg-[var(--ink-750)] shadow-[var(--shadow-xl)] overflow-y-auto no-scrollbar lg:hidden anim-slide-l">
            <div className="flex items-center justify-between p-5 border-b border-[var(--border-default)]">
              <h2 className="font-bold text-[var(--text-primary)]">Filters</h2>
              <button onClick={() => setSidebarOpen(false)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[var(--surface-100)]">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5"><SidebarContent /></div>
          </div>
        </>
      )}
    </div>
  );
}
