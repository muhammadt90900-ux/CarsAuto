'use client';
// components/features/dealers/DealersMarketplaceClient.tsx — Enterprise dealer directory
import { useState, useCallback } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { dealersApi } from '@/lib/api';
import { Search, Star, Shield, MapPin, Phone, ArrowRight, Filter, X, Grid3X3, List } from 'lucide-react';

const CITIES = ['Erbil','Sulaymaniyah','Duhok','Kirkuk','Baghdad','Basra','Dubai','Sharjah'];
const SPECIALTIES = ['All Brands','Luxury','Toyota & Lexus','Import Specialist','Electric','Budget'];
const TIERS = ['Platinum','Gold','Verified'];


const TIER_COLORS: Record<string, string> = {
  Platinum: '#a855f7',
  Gold:     'var(--gold)',
  Verified: '#22c55e',
};
const TIER_LABELS: Record<string, string> = {
  Platinum: '💎 Platinum',
  Gold:     '🌟 Gold',
  Verified: '✅ Verified',
};

// dealersApi.getAll() can come back in several shapes depending on how the
// backend wraps its response — a raw array, { data: [...] } (the paginated
// shape used by ListingListResponsePaged), or an extra-nested
// { success, data: { data: [...], total } } wrapper. Previously
// `(data as any)?.data ?? data ?? []` only handled the first two: if
// `data.data` resolved to a truthy *object* (the nested-paginated case)
// instead of an array, that object was used as-is and `dealers.map(...)`
// crashed with "dealers.map is not a function". This walks the possible
// shapes in order and guarantees an array (or []) no matter what comes back.
function normalizeDealers(data: any): any[] {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.data?.data)) return data.data.data;
  return [];
}

function DealerCard({ dealer, locale, view }: { dealer: any; locale: string; view: 'grid' | 'list' }) {
  const color = TIER_COLORS[dealer.tier];

  if (view === 'list') {
    return (
      <Link href={`/dealers/${dealer.slug}`} className="block group">
        <div className="card-premium flex items-center gap-5 p-5 hover:shadow-[0_20px_60px_rgba(0,0,0,0.25)]">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0"
               style={{ background: `${color}15`, border: `1px solid ${color}25` }}>🏪</div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <h3 className="font-bold text-[var(--text-primary)] truncate">{dealer.name}</h3>
              <span className="text-[9px] font-black uppercase tracking-widest rounded-full px-2 py-0.5 flex-shrink-0"
                    style={{ background:`${color}15`, border:`1px solid ${color}25`, color }}>{TIER_LABELS[dealer.tier]}</span>
            </div>
            <p className="text-xs text-[var(--text-muted)] flex items-center gap-2">
              <MapPin className="w-3 h-3"/>{dealer.city} · {dealer.specialty}
            </p>
          </div>
          <div className="flex items-center gap-6 text-center flex-shrink-0">
            <div><p className="font-black text-[var(--gold)] text-lg flex items-center gap-0.5">{dealer.rating}<Star className="w-3.5 h-3.5 fill-[var(--gold)] text-[var(--gold)]"/></p><p className="text-[10px] text-[var(--text-muted)]">{dealer.reviews} reviews</p></div>
            <div><p className="font-black text-[var(--text-primary)] text-lg">{dealer.listings}</p><p className="text-[10px] text-[var(--text-muted)]">listings</p></div>
            <ArrowRight className="w-4 h-4 text-[var(--text-muted)] group-hover:text-[var(--gold)] group-hover:translate-x-0.5 transition-all"/>
          </div>
        </div>
      </Link>
    );
  }

  return (
    <Link href={`/dealers/${dealer.slug}`} className="block group">
      <div className="relative rounded-2xl overflow-hidden transition-all duration-300 hover:-translate-y-1.5
                      hover:shadow-[0_24px_60px_rgba(0,0,0,0.45)] cursor-pointer"
           style={{ background:'linear-gradient(145deg,rgba(11,21,37,0.92),rgba(8,15,28,0.97))', border:`1px solid ${color}25` }}>
        <div className="absolute top-0 inset-x-0 h-0.5" style={{ background:`linear-gradient(90deg,transparent,${color},transparent)` }}/>
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
             style={{ background:`radial-gradient(ellipse at 50% 0%,${color}10 0%,transparent 65%)` }}/>
        <div className="relative p-5">
          <div className="flex items-start justify-between mb-4">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl"
                 style={{ background:`${color}12`, border:`1px solid ${color}22` }}>🏪</div>
            <span className="text-[9px] font-black uppercase tracking-widest rounded-full px-2.5 py-0.5"
                  style={{ background:`${color}15`, border:`1px solid ${color}28`, color }}>{TIER_LABELS[dealer.tier]}</span>
          </div>
          <h3 className="font-bold text-white text-sm mb-0.5 leading-tight group-hover:text-[var(--gold)] transition-colors">{dealer.name}</h3>
          <p className="flex items-center gap-1 text-[10px] text-white/35 mb-4"><MapPin className="w-2.5 h-2.5"/>{dealer.city} · Est. {dealer.yearEstablished}</p>
          <div className="grid grid-cols-3 gap-2 mb-4">
            {[
              { val: dealer.rating + '★', lbl: 'Rating' },
              { val: dealer.reviews,       lbl: 'Reviews' },
              { val: dealer.listings,      lbl: 'Listings' },
            ].map(s => (
              <div key={s.lbl} className="text-center rounded-xl py-2 bg-white/[0.04] border border-white/[0.06]">
                <div className="font-black text-white text-sm">{s.val}</div>
                <div className="text-white/30 text-[9px]">{s.lbl}</div>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between text-xs font-bold py-2.5 px-3 rounded-xl border transition-all"
               style={{ borderColor:`${color}28`, color, background:`${color}08` }}>
            View Dealer<ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform"/>
          </div>
        </div>
      </div>
    </Link>
  );
}

export function DealersMarketplaceClient({
  locale,
  initialData,
}: {
  locale: string;
  /** F-PERF fix: server-fetched, unfiltered first page — see dealers/page.tsx. */
  initialData?: { data: any[]; total: number };
}) {
  const [query, setQuery]   = useState('');
  const [city, setCity]     = useState('');
  const [tier, setTier]     = useState('');
  const [spec, setSpec]     = useState('');
  const [view, setView]     = useState<'grid'|'list'>('grid');

  // F-PERF fix: only honour server-fetched initialData while filters are
  // still at their just-mounted defaults — same reasoning as
  // CarsMarketplaceClient's matchesServerFetch guard.
  const matchesServerFetch = !query && !city && !tier;

  // Fetch real dealers from API, passing filters as query params
  const { data, isLoading } = useQuery({
    queryKey: ['dealers', 'list', { query, city, tier, spec }],
    queryFn:  () => dealersApi.getAll({
      ...(query && { search: query }),
      ...(city  && { city }),
      ...(tier  && { tier }),
    }),
    staleTime: 60_000,
    ...(matchesServerFetch && initialData ? { initialData } : {}),
  });

  const allDealers: any[] = normalizeDealers(data);
  // Client-side filter for specialty (no backend param yet)
  const dealers = spec
    ? allDealers.filter((d: any) =>
        (d.specialties?.[0] ?? d.specialty ?? '').includes(spec))
    : allDealers;

  return (
    <div className="min-h-screen bg-[var(--surface-0)] dark:bg-[var(--ink-900)]">
      {/* Header */}
      <div className="relative overflow-hidden border-b border-[var(--border-default)]"
           style={{ background:'linear-gradient(135deg,var(--ink-900) 0%,var(--ink-750) 60%,var(--ink-900) 100%)' }}>
        <div className="absolute inset-0 opacity-[0.025] bg-dot-grid"/>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <nav className="flex items-center gap-2 text-xs text-white/40 mb-4">
            <Link href="/" className="hover:text-[var(--gold)] transition-colors">Home</Link>
            <span>/</span><span className="text-white/60">Dealers</span>
          </nav>
          <h1 className="text-3xl sm:text-4xl font-display font-black text-white mb-2">
            فرۆشیارەکان / <span className="text-[var(--gold)]">Dealers</span>
          </h1>
          <p className="text-white/45 text-sm mb-6">Connect with verified dealerships across Iraq &amp; UAE</p>
          {/* Search */}
          <div className="relative max-w-xl">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30"/>
            <input value={query} onChange={e => setQuery(e.target.value)}
              placeholder="Search dealers by name, city, specialty…"
              className="w-full h-12 bg-white/[0.08] backdrop-blur-xl border border-white/[0.12] rounded-2xl
                         pl-11 pr-4 text-white placeholder-white/30 text-sm outline-none
                         focus:border-[rgba(201,168,76,0.5)] focus:shadow-[0_0_0_3px_rgba(201,168,76,0.10)] transition-all"/>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filter bar */}
        <div className="flex flex-wrap gap-3 mb-7 items-center justify-between">
          <div className="flex flex-wrap gap-2">
            {/* City */}
            <select value={city} onChange={e => setCity(e.target.value)}
              className="input-base h-9 text-xs w-36">
              <option value="">All Cities</option>
              {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            {/* Tier */}
            <select value={tier} onChange={e => setTier(e.target.value)}
              className="input-base h-9 text-xs w-32">
              <option value="">All Tiers</option>
              {TIERS.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            {/* Specialty */}
            <select value={spec} onChange={e => setSpec(e.target.value)}
              className="input-base h-9 text-xs w-44">
              <option value="">All Specialties</option>
              {SPECIALTIES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            {(city || tier || spec) && (
              <button onClick={() => { setCity(''); setTier(''); setSpec(''); }}
                className="flex items-center gap-1 px-3 h-9 rounded-xl text-xs text-red-400 border border-red-200 dark:border-red-900/30 hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors">
                <X className="w-3 h-3"/>Clear
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-[var(--text-muted)] hidden sm:block"><strong className="text-[var(--text-primary)]">{dealers.length}</strong> dealers</span>
            <div className="flex rounded-xl overflow-hidden border border-[var(--border-default)] bg-white dark:bg-[var(--ink-750)]">
              {(['grid','list'] as const).map(v => (
                <button key={v} onClick={() => setView(v)}
                  className={`p-2 transition-colors ${view===v ? 'bg-[var(--gold-subtle)] text-[var(--gold)]' : 'text-[var(--text-muted)] hover:text-[var(--gold)]'}`}>
                  {v === 'grid' ? <Grid3X3 className="w-4 h-4"/> : <List className="w-4 h-4"/>}
                </button>
              ))}
            </div>
          </div>
        </div>

        {dealers.length === 0 ? (
          <div className="text-center py-24">
            <div className="text-6xl mb-4">🏪</div>
            <h3 className="text-xl font-bold text-[var(--text-primary)] mb-2">No dealers found</h3>
            <button onClick={() => { setQuery(''); setCity(''); setTier(''); setSpec(''); }}
              className="btn-ghost mt-4">Clear Filters</button>
          </div>
        ) : (
          <div className={view === 'grid'
            ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5'
            : 'flex flex-col gap-3'}>
            {isLoading ? (
            Array.from({length:6}).map((_,i) => (
              <div key={i} className="card-premium h-48 animate-pulse" />
            ))
          ) : dealers.length === 0 ? (
            <div className="col-span-full py-20 text-center">
              <p className="text-white/30 text-sm">No dealers found. Try adjusting your filters.</p>
            </div>
          ) : dealers.map(d => <DealerCard key={d.id} dealer={d} locale={locale} view={view}/>)}
          </div>
        )}

        {/* Become a dealer CTA */}
        <div className="mt-16 relative rounded-3xl overflow-hidden p-10 text-center"
             style={{ background:'linear-gradient(135deg,#070e1b 0%,var(--ink-700) 50%,#070e1b 100%)' }}>
          <div className="absolute inset-0 opacity-[0.03] bg-dot-grid"/>
          <div className="absolute top-0 inset-x-0 h-0.5 divider-gold"/>
          <div className="relative">
            <span className="section-eyebrow">🏪 Dealer Portal</span>
            <h2 className="text-2xl sm:text-3xl font-black text-white mb-3">List Your Dealership</h2>
            <p className="text-white/45 text-sm max-w-md mx-auto mb-6">
              Join 1,200+ verified dealers reaching thousands of buyers across Iraq, Kurdistan & UAE.
            </p>
            <Link href="/dealers/register"
              className="btn-gold inline-flex px-8 py-3.5 text-sm rounded-xl">
              Register as Dealer →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
