'use client';
// app/[locale]/dashboard/favorites/page.tsx — FEATURE 9: "Followed Dealers" tab added

import { useState } from 'react';
import Link from 'next/link';
import { useTranslations, useLocale } from 'next-intl';
import { Heart, Store, Star, MapPin } from 'lucide-react';
import { useFollowedDealers } from '@/hooks/useDealerFollow';

export default function FavoritesPage() {
  const t = useTranslations('dashboard');
  const locale = useLocale();
  const [activeTab, setActiveTab] = useState<'listings' | 'dealers'>('listings');

  // TODO: fetch real favorites from API
  const favorites: any[] = [];

  const { data: followedDealers, isLoading: dealersLoading } = useFollowedDealers();

  const dirAttr = locale === 'ku' || locale === 'ar' ? 'rtl' : 'ltr';

  return (
    <div className="p-5 lg:p-7 space-y-5" dir={dirAttr}>
      <div>
        <h1 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">{t('favorites')}</h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 dark:bg-white/[0.04] rounded-2xl p-1 w-fit">
        <button
          onClick={() => setActiveTab('listings')}
          className={`flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200
            ${activeTab === 'listings'
              ? 'bg-white dark:bg-[#0b1525] text-amber-600 dark:text-amber-400 shadow-sm'
              : 'text-gray-500 dark:text-white/50 hover:text-gray-800 dark:hover:text-white/80'}`}
        >
          <Heart className="w-3.5 h-3.5" />
          {t('savedListings')}
        </button>
        <button
          onClick={() => setActiveTab('dealers')}
          className={`flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200
            ${activeTab === 'dealers'
              ? 'bg-white dark:bg-[#0b1525] text-amber-600 dark:text-amber-400 shadow-sm'
              : 'text-gray-500 dark:text-white/50 hover:text-gray-800 dark:hover:text-white/80'}`}
        >
          <Store className="w-3.5 h-3.5" />
          {t('followedDealers')}
          {followedDealers && followedDealers.length > 0 && (
            <span className="text-[10px] rounded-full px-1.5 py-0.5 font-bold bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400">
              {followedDealers.length}
            </span>
          )}
        </button>
      </div>

      {/* Saved Listings tab */}
      {activeTab === 'listings' && (
        favorites.length === 0 ? (
          <div className="text-center py-20">
            <Heart className="w-12 h-12 text-gray-300 dark:text-white/20 mx-auto mb-4" aria-hidden />
            <h3 className="font-semibold text-gray-700 dark:text-white/60">{t('noFavorites')}</h3>
            <p className="text-sm text-gray-400 mt-1">{t('noFavoritesDesc')}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {favorites.map((fav) => (
              <div key={fav.id}>{fav.title}</div>
            ))}
          </div>
        )
      )}

      {/* Followed Dealers tab — FEATURE 9 */}
      {activeTab === 'dealers' && (
        dealersLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-40 rounded-2xl bg-gray-100 dark:bg-white/[0.04] animate-pulse" />
            ))}
          </div>
        ) : !followedDealers || followedDealers.length === 0 ? (
          <div className="text-center py-20">
            <Store className="w-12 h-12 text-gray-300 dark:text-white/20 mx-auto mb-4" aria-hidden />
            <h3 className="font-semibold text-gray-700 dark:text-white/60">{t('noFollowedDealers')}</h3>
            <p className="text-sm text-gray-400 mt-1">{t('noFollowedDealersDesc')}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {followedDealers.map(({ dealer, followedAt }) => {
              const name = locale === 'ku' ? dealer.nameKu : locale === 'ar' ? dealer.nameAr : dealer.nameEn;
              const latestListing = dealer.listings?.[0];
              const listingTitle = latestListing
                ? (locale === 'ku' ? latestListing.titleKu : locale === 'ar' ? latestListing.titleAr : latestListing.titleEn)
                : null;

              return (
                <Link
                  key={dealer.id}
                  href="/dealers/${dealer.slug}"
                  className="rounded-2xl border border-gray-200 dark:border-white/[0.08] bg-white dark:bg-[#0b1525]
                             p-4 hover:shadow-lg transition-shadow group"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 rounded-xl bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center text-2xl flex-shrink-0">
                      🏪
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-gray-900 dark:text-white text-sm truncate">{name}</h3>
                      <div className="flex items-center gap-2 text-xs text-gray-400">
                        <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                        {Number(dealer.averageRating).toFixed(1)}
                        {dealer.location?.city && (
                          <>
                            <span>·</span>
                            <MapPin className="w-3 h-3" />
                            {dealer.location.city}
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {latestListing ? (
                    <div className="flex items-center gap-2 p-2 rounded-xl bg-gray-50 dark:bg-white/[0.03] group-hover:bg-amber-50 dark:group-hover:bg-amber-500/[0.06] transition-colors">
                      {latestListing.images?.[0]?.url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={latestListing.images[0].url} alt="" className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-gray-200 dark:bg-white/10 flex items-center justify-center text-lg flex-shrink-0">🚗</div>
                      )}
                      <div className="min-w-0">
                        <p className="text-[10px] text-gray-400 uppercase tracking-wide">{t('latestListing')}</p>
                        <p className="text-xs font-semibold text-gray-700 dark:text-white/80 truncate">{listingTitle}</p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-gray-400">{t('noActiveListings')}</p>
                  )}
                </Link>
              );
            })}
          </div>
        )
      )}
    </div>
  );
}
