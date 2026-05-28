'use client';
// components/features/dealers/DealersMarketplaceClient.tsx

import { useState, useCallback } from 'react';
import { Search, SlidersHorizontal, Star, ChevronDown, X } from 'lucide-react';
import { DealerCard } from './DealerCard';
import { cn } from '@auto-bazaar-pro/utils';

const TIER_OPTIONS = [
  { value: '',         label: 'All Tiers' },
  { value: 'PLATINUM', label: '💎 Platinum' },
  { value: 'GOLD',     label: '⭐ Gold' },
  { value: 'STANDARD', label: '✓ Standard' },
];

const SORT_OPTIONS = [
  { value: 'rating',   label: 'Top Rated' },
  { value: 'reviews',  label: 'Most Reviewed' },
  { value: 'listings', label: 'Most Listings' },
  { value: 'newest',   label: 'Newest' },
];

interface Props {
  initial: { dealers: any[]; total: number; page: number; pages: number };
  locale: string;
}

export function DealersMarketplaceClient({ initial, locale }: Props) {
  const [dealers, setDealers] = useState(initial.dealers);
  const [total, setTotal]     = useState(initial.total);
  const [loading, setLoading] = useState(false);

  const [search,    setSearch]    = useState('');
  const [tier,      setTier]      = useState('');
  const [sortBy,    setSortBy]    = useState('rating');
  const [minRating, setMinRating] = useState(0);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const fetchDealers = useCallback(async (params: Record<string, string>) => {
    setLoading(true);
    try {
      const qs = new URLSearchParams(Object.fromEntries(Object.entries(params).filter(([,v]) => v))).toString();
      const res = await fetch(`/api/dealers?${qs}`);
      const data = await res.json();
      setDealers(data.dealers);
      setTotal(data.total);
    } finally {
      setLoading(false);
    }
  }, []);

  const applyFilters = useCallback(() => {
    fetchDealers({ search, tier, sortBy, minRating: minRating ? String(minRating) : '' });
  }, [search, tier, sortBy, minRating, fetchDealers]);

  const clearFilters = useCallback(() => {
    setSearch(''); setTier(''); setSortBy('rating'); setMinRating(0);
    fetchDealers({});
  }, [fetchDealers]);

  const activeFilters = !!(search || tier || minRating);

  return (
    <div className="min-h-screen bg-[#060e1a]">

      {/* ── Page header ── */}
      <div className="relative overflow-hidden bg-gradient-to-br from-[#0b1a2e] to-[#060e1a] border-b border-white/[0.06] py-12 px-4">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_100%,rgba(201,168,76,0.06),transparent_70%)]" />
        <div className="max-w-5xl mx-auto relative">
          <div className="flex items-center gap-2 text-[#c9a84c] text-xs font-semibold uppercase tracking-widest mb-3">
            <span className="w-6 h-px bg-[#c9a84c]" />
            Verified Dealers
          </div>
          <h1 className="font-display font-black text-white text-3xl md:text-4xl mb-2">
            Find Trusted Dealerships
          </h1>
          <p className="text-white/50 text-sm max-w-xl">
            Browse {total.toLocaleString()} verified dealers across the region. Premium showrooms, genuine vehicles, professional service.
          </p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8">

        {/* ── Search + filter bar ── */}
        <div className="flex flex-col md:flex-row gap-3 mb-6">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && applyFilters()}
              placeholder="Search dealers, brands, city…"
              className="w-full pl-10 pr-4 py-3 rounded-xl bg-[#0d1b2e] border border-white/[0.09] text-white text-sm placeholder:text-white/30 focus:outline-none focus:border-[#c9a84c]/40"
            />
          </div>

          {/* Sort */}
          <div className="relative">
            <select
              value={sortBy}
              onChange={e => { setSortBy(e.target.value); }}
              className="appearance-none pl-4 pr-9 py-3 rounded-xl bg-[#0d1b2e] border border-white/[0.09] text-white text-sm focus:outline-none focus:border-[#c9a84c]/40 cursor-pointer"
            >
              {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30 pointer-events-none" />
          </div>

          {/* Filter toggle */}
          <button
            onClick={() => setFiltersOpen(p => !p)}
            className={cn(
              'flex items-center gap-2 px-4 py-3 rounded-xl border text-sm font-semibold transition-all',
              filtersOpen || activeFilters
                ? 'bg-[#c9a84c]/15 border-[#c9a84c]/40 text-[#e8cc7a]'
                : 'bg-[#0d1b2e] border-white/[0.09] text-white/60 hover:border-white/20',
            )}
          >
            <SlidersHorizontal className="w-4 h-4" />
            Filters
            {activeFilters && <span className="w-2 h-2 rounded-full bg-[#c9a84c]" />}
          </button>

          <button
            onClick={applyFilters}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-[#c9a84c] to-[#e8cc7a] text-[#0d1b2e] font-bold text-sm hover:opacity-90 transition-opacity"
          >
            Search
          </button>
        </div>

        {/* ── Expandable filter panel ── */}
        {filtersOpen && (
          <div className="mb-6 p-5 rounded-2xl bg-[#0d1b2e] border border-white/[0.07] flex flex-wrap gap-6">
            {/* Tier */}
            <div>
              <div className="text-[0.7rem] text-white/40 uppercase tracking-wider mb-2">Dealer Tier</div>
              <div className="flex items-center gap-2 flex-wrap">
                {TIER_OPTIONS.map(o => (
                  <button
                    key={o.value}
                    onClick={() => setTier(o.value)}
                    className={cn(
                      'px-3 py-1.5 rounded-full text-xs font-semibold transition-all border',
                      tier === o.value
                        ? 'bg-[#c9a84c]/20 border-[#c9a84c]/50 text-[#e8cc7a]'
                        : 'bg-white/[0.04] border-white/[0.08] text-white/50 hover:border-white/20',
                    )}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Min rating */}
            <div>
              <div className="text-[0.7rem] text-white/40 uppercase tracking-wider mb-2">Min. Rating</div>
              <div className="flex items-center gap-2">
                {[0, 3, 4, 4.5].map(r => (
                  <button
                    key={r}
                    onClick={() => setMinRating(r)}
                    className={cn(
                      'flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold transition-all border',
                      minRating === r
                        ? 'bg-[#c9a84c]/20 border-[#c9a84c]/50 text-[#e8cc7a]'
                        : 'bg-white/[0.04] border-white/[0.08] text-white/50 hover:border-white/20',
                    )}
                  >
                    {r === 0 ? 'Any' : (
                      <><Star className="w-3 h-3 fill-current" />{r}+</>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {activeFilters && (
              <button onClick={clearFilters} className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300 ml-auto mt-auto transition-colors">
                <X className="w-3 h-3" /> Clear filters
              </button>
            )}
          </div>
        )}

        {/* ── Tier filter pills ── */}
        <div className="flex items-center gap-2 flex-wrap mb-6">
          {['All', '💎 Platinum', '⭐ Gold', '✓ Standard'].map((t, i) => {
            const val = ['', 'PLATINUM', 'GOLD', 'STANDARD'][i];
            return (
              <button
                key={t}
                onClick={() => { setTier(val); fetchDealers({ tier: val, sortBy }); }}
                className={cn(
                  'px-4 py-1.5 rounded-full text-xs font-semibold transition-all border',
                  tier === val
                    ? 'bg-[#c9a84c]/20 border-[#c9a84c]/40 text-[#e8cc7a]'
                    : 'bg-transparent border-white/[0.09] text-white/50 hover:border-white/20',
                )}
              >
                {t}
              </button>
            );
          })}
          <span className="ml-auto text-xs text-white/30">{total.toLocaleString()} dealers</span>
        </div>

        {/* ── Grid ── */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {Array.from({ length: 6 }, (_, i) => (
              <div key={i} className="h-72 rounded-2xl bg-[#0d1b2e] border border-white/[0.06] animate-pulse" />
            ))}
          </div>
        ) : dealers.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {dealers.map(d => (
              <DealerCard key={d.id} dealer={d} locale={locale} />
            ))}
          </div>
        ) : (
          <div className="py-20 text-center">
            <div className="text-5xl mb-4">🏢</div>
            <p className="text-white/40 text-sm">No dealers found. Try adjusting filters.</p>
          </div>
        )}
      </div>
    </div>
  );
}
