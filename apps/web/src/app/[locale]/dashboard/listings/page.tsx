'use client';
// dashboard/listings/page.tsx — UX-Improved: status tabs, bulk actions, performance chart hint

import { useEffect, useState, useCallback } from 'react';
import { listingsApi } from '@/lib/api';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useParams } from 'next/navigation';
import {
  Plus, Eye, Edit3, Trash2, Search, TrendingUp,
  Car, ChevronRight, RefreshCw, BarChart2, AlertCircle, Clock,
  CheckCircle2, XCircle, Zap,
} from 'lucide-react';

const STATUS_TABS = [
  { key: 'ALL',     label: 'All'     },
  { key: 'ACTIVE',  label: 'Active'  },
  { key: 'PENDING', label: 'Pending' },
  { key: 'SOLD',    label: 'Sold'    },
  { key: 'EXPIRED', label: 'Expired' },
] as const;

type StatusKey = typeof STATUS_TABS[number]['key'];

const STATUS_CONFIG: Record<string, { label: string; cls: string; icon: React.ElementType }> = {
  ACTIVE:  { label: 'Active',  cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400', icon: CheckCircle2 },
  PENDING: { label: 'Pending', cls: 'bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400',         icon: Clock },
  SOLD:    { label: 'Sold',    cls: 'bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400',             icon: CheckCircle2 },
  EXPIRED: { label: 'Expired', cls: 'bg-gray-100 text-gray-600 dark:bg-white/5 dark:text-gray-400',                icon: XCircle },
};

export default function MyListingsPage() {
  const t  = useTranslations('dashboard');
  const params = useParams();
  const locale = Array.isArray(params.locale) ? params.locale[0] : (params.locale ?? 'ku');

  const [listings,   setListings]   = useState<any[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [search,     setSearch]     = useState('');
  const [activeTab,  setActiveTab]  = useState<StatusKey>('ALL');
  const [selected,   setSelected]   = useState<Set<string>>(new Set());

  useEffect(() => {
    listingsApi.myListings()
      .then(data => setListings(data ?? []))
      .catch(() => setListings([]))
      .finally(() => setLoading(false));
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this listing? This cannot be undone.')) return;
    try { await listingsApi.delete(id); } catch {}
    setListings(prev => prev.filter(l => l.id !== id));
    setSelected(prev => { const s = new Set(prev); s.delete(id); return s; });
  };

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const s = new Set(prev);
      s.has(id) ? s.delete(id) : s.add(id);
      return s;
    });
  };

  const filtered = listings.filter(l => {
    const title = (l.titleKu ?? l.titleEn ?? '').toLowerCase();
    const matchSearch = title.includes(search.toLowerCase());
    const matchTab    = activeTab === 'ALL' || l.status === activeTab;
    return matchSearch && matchTab;
  });

  const counts = listings.reduce((acc: Record<string, number>, l) => {
    acc[l.status] = (acc[l.status] || 0) + 1;
    return acc;
  }, {});

  if (loading) {
    return (
      <div className="p-5 lg:p-7 space-y-4">
        <div className="h-8 w-48 bg-gray-100 dark:bg-white/5 rounded-xl animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-52 bg-gray-100 dark:bg-white/5 rounded-2xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-5 lg:p-7 space-y-5 min-h-full">

      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-black text-gray-900 dark:text-white">My Listings</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {listings.length} total · {counts['ACTIVE'] ?? 0} active
          </p>
        </div>
        <div className="flex items-center gap-2">
          {selected.size > 0 && (
            <button
              onClick={() => {
                if (confirm(`Delete ${selected.size} listings?`)) {
                  selected.forEach(id => handleDelete(id));
                  setSelected(new Set());
                }
              }}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold
                         bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400
                         border border-red-200 dark:border-red-500/20 transition-all"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Delete {selected.size}
            </button>
          )}
          <Link
            href="/dashboard/listings/new"
            className="inline-flex items-center gap-2 px-4 py-2.5
                       bg-[var(--gold)] hover:bg-[#d4b45a] text-[var(--ink-900)]
                       rounded-xl text-sm font-bold transition-all duration-200
                       shadow-gold hover:shadow-gold-xl
                       hover:-translate-y-0.5 active:translate-y-0"
          >
            <Plus className="w-4 h-4" />
            New Listing
          </Link>
        </div>
      </div>

      {/* ── Performance summary strip ─────────────────────────── */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Total Views',   value: listings.reduce((a, l) => a + (l.views || 0), 0).toLocaleString(), icon: Eye,       color: 'text-blue-500' },
          { label: 'Total Saves',   value: listings.reduce((a, l) => a + (l.favorites || 0), 0).toLocaleString(), icon: TrendingUp, color: 'text-rose-400' },
          { label: 'Active',        value: (counts['ACTIVE'] ?? 0).toString(), icon: Zap, color: 'text-emerald-500' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label}
               className="flex items-center gap-3 p-3 rounded-2xl
                          bg-white dark:bg-[var(--ink-750)] border border-gray-100 dark:border-white/[0.07]">
            <Icon className={`w-4 h-4 flex-shrink-0 ${color}`} aria-hidden />
            <div>
              <p className="text-base font-black text-gray-900 dark:text-white leading-none">{value}</p>
              <p className="text-[10px] text-gray-400 mt-0.5">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Search + status tabs ──────────────────────────────── */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" aria-hidden />
          <input
            type="search"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search listings…"
            className="w-full ps-9 pe-4 py-2.5 text-sm rounded-xl
                       border border-gray-200 dark:border-white/10
                       bg-white dark:bg-white/5 text-gray-900 dark:text-white
                       placeholder-gray-400 outline-none
                       focus:ring-2 focus:ring-[rgba(201,168,76,0.2)] focus:border-[rgba(201,168,76,0.4)]
                       transition-all"
          />
        </div>
        <div className="flex gap-1 bg-gray-100 dark:bg-white/[0.05] p-1 rounded-xl">
          {STATUS_TABS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150
                          ${activeTab === key
                            ? 'bg-white dark:bg-[var(--ink-750)] text-gray-900 dark:text-white shadow-sm'
                            : 'text-gray-500 dark:text-white/40 hover:text-gray-700 dark:hover:text-white/60'}`}
            >
              {label}
              {key !== 'ALL' && counts[key] ? (
                <span className="ms-1 text-[9px] text-gray-400 dark:text-white/30">
                  ({counts[key]})
                </span>
              ) : null}
            </button>
          ))}
        </div>
      </div>

      {/* ── Grid ─────────────────────────────────────────────── */}
      {filtered.length === 0 ? (
        <div className="text-center py-20 rounded-2xl border-2 border-dashed
                        border-gray-200 dark:border-white/[0.07]">
          <Car className="w-10 h-10 text-gray-300 dark:text-white/15 mx-auto mb-3" aria-hidden />
          <h3 className="font-semibold text-gray-600 dark:text-white/50">No listings found</h3>
          <p className="text-sm text-gray-400 mt-1 mb-5">
            {search ? 'Try a different search term' : 'Post your first listing to get started'}
          </p>
          <Link
            href="/dashboard/listings/new"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold
                       bg-[var(--gold)] text-[var(--ink-900)] hover:bg-[#d4b45a] transition-all"
          >
            <Plus className="w-4 h-4" />
            Post a Listing
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(listing => {
            const cfg   = STATUS_CONFIG[listing.status] ?? STATUS_CONFIG.ACTIVE;
            const StatusIcon = cfg.icon;
            const urgentRenew = listing.daysLeft !== null && listing.daysLeft !== undefined && listing.daysLeft <= 7;
            const isSelected  = selected.has(listing.id);

            return (
              <div
                key={listing.id}
                className={`rounded-2xl border overflow-hidden group transition-all duration-200
                            bg-white dark:bg-[var(--ink-750)]
                            hover:shadow-lg hover:shadow-black/10 dark:hover:shadow-black/40
                            hover:-translate-y-0.5
                            ${isSelected
                              ? 'border-[rgba(201,168,76,0.5)] ring-2 ring-[rgba(201,168,76,0.2)]'
                              : 'border-gray-100 dark:border-white/[0.07] hover:border-[rgba(201,168,76,0.3)] dark:hover:border-[rgba(201,168,76,0.2)]'}`}
              >
                {/* Image */}
                <div className="relative h-40 bg-gradient-to-br from-slate-100 to-slate-200
                                dark:from-white/5 dark:to-white/[0.02] overflow-hidden">
                  {listing.coverImage ? (
                    <img
                      src={listing.coverImage}
                      alt={listing.titleEn ?? ''}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <Car className="w-10 h-10 text-gray-300 dark:text-white/10" aria-hidden />
                    </div>
                  )}

                  {/* Select checkbox */}
                  <button
                    onClick={() => toggleSelect(listing.id)}
                    className={`absolute top-2 start-2 w-6 h-6 rounded-lg border-2 flex items-center justify-center
                                transition-all duration-150
                                ${isSelected
                                  ? 'bg-[var(--gold)] border-[var(--gold)]'
                                  : 'bg-black/30 border-white/40 opacity-60 group-hover:opacity-100'}`}
                    aria-label="Select listing"
                  >
                    {isSelected && (
                      <svg className="w-3 h-3 text-[var(--ink-900)]" viewBox="0 0 12 12" fill="none">
                        <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    )}
                  </button>

                  {/* Status badge */}
                  <span className={`absolute top-2 end-2 inline-flex items-center gap-1
                                   text-[10px] font-bold px-2 py-0.5 rounded-full ${cfg.cls}`}>
                    <StatusIcon className="w-2.5 h-2.5" aria-hidden />
                    {cfg.label}
                  </span>

                  {/* Days left warning */}
                  {urgentRenew && (
                    <div className="absolute bottom-0 inset-x-0 px-3 py-1.5
                                    bg-amber-500/90 backdrop-blur-sm">
                      <p className="text-[10px] font-bold text-white flex items-center gap-1">
                        <AlertCircle className="w-3 h-3 flex-shrink-0" />
                        Expires in {listing.daysLeft} day{listing.daysLeft !== 1 ? 's' : ''} — renew now
                      </p>
                    </div>
                  )}
                </div>

                {/* Body */}
                <div className="p-4 space-y-3">
                  <div>
                    <h3 className="font-bold text-gray-900 dark:text-white text-sm leading-tight">
                      {listing.titleEn ?? listing.titleKu ?? '—'}
                    </h3>
                    <p className="text-[var(--gold)] font-black text-lg mt-0.5 tabular-nums">
                      ${listing.price?.toLocaleString()}
                    </p>
                  </div>

                  {/* Stats row */}
                  <div className="flex items-center gap-4 text-xs text-gray-400 dark:text-white/35">
                    <span className="flex items-center gap-1">
                      <Eye className="w-3.5 h-3.5" aria-hidden />
                      {listing.views ?? 0} views
                    </span>
                    <span className="flex items-center gap-1">
                      <TrendingUp className="w-3.5 h-3.5" aria-hidden />
                      {listing.favorites ?? 0} saves
                    </span>
                    {listing.daysLeft !== null && listing.daysLeft !== undefined && !urgentRenew && (
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" aria-hidden />
                        {listing.daysLeft}d left
                      </span>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 pt-1">
                    <Link
                      href={`/dashboard/listings/${listing.id}/edit`}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 rounded-xl
                                 border border-gray-200 dark:border-white/10 text-xs font-semibold
                                 text-gray-700 dark:text-gray-300
                                 hover:bg-gray-50 dark:hover:bg-white/5 hover:border-[rgba(201,168,76,0.4)]
                                 transition-all duration-150"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      Edit
                    </Link>
                    <Link
                      href={`/cars/${listing.id}`}
                      className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl
                                 border border-gray-200 dark:border-white/10 text-xs font-semibold
                                 text-gray-600 dark:text-gray-400
                                 hover:bg-gray-50 dark:hover:bg-white/5
                                 transition-all duration-150"
                      aria-label="Preview listing"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </Link>
                    <button
                      onClick={() => handleDelete(listing.id)}
                      className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl
                                 border border-red-200 dark:border-red-500/20 text-xs font-semibold
                                 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/5
                                 transition-all duration-150"
                      aria-label="Delete listing"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Boost upsell when listings exist */}
      {listings.length > 0 && (
        <div className="rounded-2xl p-4 flex items-center justify-between gap-4
                        bg-gradient-to-r from-[rgba(201,168,76,0.08)] to-transparent
                        border border-[rgba(201,168,76,0.15)]">
          <div className="flex items-center gap-3">
            <BarChart2 className="w-5 h-5 text-[var(--gold)] flex-shrink-0" aria-hidden />
            <div>
              <p className="text-sm font-bold text-gray-900 dark:text-white">
                Boost your reach
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Featured listings get 5× more views. First 7 days free.
              </p>
            </div>
          </div>
          <Link
            href="/dashboard/subscription"
            className="flex-shrink-0 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl
                       text-sm font-bold bg-[var(--gold)] text-[var(--ink-900)]
                       hover:bg-[#d4b45a] transition-all duration-200
                       shadow-gold"
          >
            Upgrade <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      )}
    </div>
  );
}
