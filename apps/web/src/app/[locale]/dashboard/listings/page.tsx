'use client';
// app/[locale]/dashboard/listings/page.tsx — Fully localized

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useParams } from 'next/navigation';
import { Plus, Eye, Edit3, Trash2, Search, Filter, MoreHorizontal, Car, TrendingUp } from 'lucide-react';

export default function MyListingsPage() {
  const t  = useTranslations('dashboard');
  const tl = useTranslations('listing');
  const params = useParams();
  const locale = Array.isArray(params.locale) ? params.locale[0] : (params.locale ?? 'ku');

  const [listings,    setListings]    = useState<any[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [search,      setSearch]      = useState('');
  const [activeMenu,  setActiveMenu]  = useState<string | null>(null);

  useEffect(() => {
    api.listings
      .myListings()
      .then(setListings)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm(t('deleteConfirm'))) return;
    await api.listings.delete(id);
    setListings((prev) => prev.filter((l) => l.id !== id));
    setActiveMenu(null);
  };

  const filtered = listings.filter((l) => {
    const title = l.titleKu ?? l.titleEn ?? '';
    return title.toLowerCase().includes(search.toLowerCase());
  });

  const statusColor: Record<string, string> = {
    ACTIVE:  'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400',
    PENDING: 'bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400',
    SOLD:    'bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400',
    EXPIRED: 'bg-gray-100 text-gray-600 dark:bg-white/5 dark:text-gray-400',
  };
  const statusLabel: Record<string, string> = {
    ACTIVE:  tl('active'),
    PENDING: tl('pending'),
    SOLD:    tl('sold'),
    EXPIRED: tl('expired'),
  };

  if (loading) {
    return (
      <div className="p-5 lg:p-7 space-y-4">
        <div className="h-8 w-48 bg-gray-100 dark:bg-white/5 rounded-xl animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-44 bg-gray-100 dark:bg-white/5 rounded-2xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-5 lg:p-7 space-y-5 min-h-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">
            {t('myListings')}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {t('manageListings')}
          </p>
        </div>
        <Link
          href={`/${locale}/dashboard/listings/new`}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#e94560] hover:bg-[#d63d57]
                     text-white rounded-xl text-sm font-semibold transition-all duration-200
                     shadow-lg shadow-[#e94560]/25 hover:shadow-[#e94560]/40 hover:-translate-y-0.5
                     active:translate-y-0 w-fit"
        >
          <Plus className="w-4 h-4" aria-hidden />
          {t('addListing')}
        </Link>
      </div>

      {/* Search & Filter */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" aria-hidden />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('searchListings')}
            className="w-full ps-9 pe-4 py-2.5 text-sm rounded-xl border border-gray-200
                       dark:border-white/10 bg-white dark:bg-white/5 text-gray-900 dark:text-white
                       placeholder-gray-400 outline-none focus:ring-2 focus:ring-[#e94560]/20
                       focus:border-[#e94560]/40 transition-all"
          />
        </div>
        <button className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border
                           border-gray-200 dark:border-white/10 bg-white dark:bg-white/5
                           text-sm font-medium text-gray-700 dark:text-gray-300
                           hover:bg-gray-50 dark:hover:bg-white/10 transition-colors">
          <Filter className="w-4 h-4" aria-hidden />
          {t('filterListings')}
        </button>
      </div>

      {/* Listings grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-20">
          <Car className="w-12 h-12 text-gray-300 dark:text-white/20 mx-auto mb-4" aria-hidden />
          <h3 className="font-semibold text-gray-700 dark:text-white/60">{t('noListings')}</h3>
          <p className="text-sm text-gray-400 mt-1">{t('noListingsDesc')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((listing) => (
            <div
              key={listing.id}
              className="rounded-2xl border border-gray-100 dark:border-white/[0.07]
                         bg-white dark:bg-[#0b1525] overflow-hidden group
                         hover:shadow-lg hover:shadow-black/10 dark:hover:shadow-black/30
                         transition-all duration-300"
            >
              {/* Image */}
              <div className="h-40 bg-gradient-to-br from-slate-100 to-slate-200 dark:from-white/5 dark:to-white/[0.02] relative overflow-hidden">
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
                <span className={`absolute top-2 end-2 text-xs font-semibold px-2 py-0.5 rounded-full ${statusColor[listing.status] ?? statusColor.ACTIVE}`}>
                  {statusLabel[listing.status] ?? listing.status}
                </span>
              </div>

              {/* Details */}
              <div className="p-4 space-y-3">
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white text-sm leading-tight">
                    {listing.titleKu ?? listing.titleEn ?? '—'}
                  </h3>
                  <p className="text-[#c9a84c] font-bold text-base mt-0.5">
                    {listing.price?.toLocaleString()} {listing.currency ?? '$'}
                  </p>
                </div>

                <div className="flex items-center justify-between text-xs text-gray-400 dark:text-white/40">
                  <span className="flex items-center gap-1">
                    <Eye className="w-3.5 h-3.5" aria-hidden />
                    {listing.views ?? 0} {tl('views')}
                  </span>
                  <span className="flex items-center gap-1">
                    <TrendingUp className="w-3.5 h-3.5" aria-hidden />
                    {listing.favorites ?? 0} {tl('favorites')}
                  </span>
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-1">
                  <Link
                    href={`/${locale}/dashboard/listings/${listing.id}/edit`}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 rounded-lg
                               border border-gray-200 dark:border-white/10 text-xs font-medium
                               text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5
                               transition-colors"
                  >
                    <Edit3 className="w-3.5 h-3.5" aria-hidden />
                    {t('editProfile').replace('Profile', '')}
                  </Link>
                  <button
                    onClick={() => handleDelete(listing.id)}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 rounded-lg
                               border border-red-200 dark:border-red-500/20 text-xs font-medium
                               text-red-500 hover:bg-red-50 dark:hover:bg-red-500/5 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" aria-hidden />
                    {/* common.delete */}
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
