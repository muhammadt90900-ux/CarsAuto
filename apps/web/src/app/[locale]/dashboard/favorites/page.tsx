'use client';
// app/[locale]/dashboard/favorites/page.tsx
//
// Previously two problems at once:
//   1. This file hardcoded `const favorites: any[] = []` with a
//      `// TODO: fetch real favorites from API` comment — the page always
//      rendered empty regardless of what a user had saved.
//   2. A more complete version (tabbed Saved Listings / Followed Dealers)
//      existed alongside this one as `favorites-page.tsx`, but Next.js only
//      renders files literally named `page.tsx` — so that version had zero
//      effect on the live app and nobody noticed it was dead code.
//
// This merges the two: the tabbed UI + dealer-follow integration from the
// unused file, now driven by the real favorites API via useFavorites().

import { useState } from 'react';
import Image from 'next/image';
import { Link } from '@/i18n/navigation';
import { useTranslations, useLocale } from 'next-intl';
import { Heart, Store, Star, MapPin } from 'lucide-react';
import { useFollowedDealers } from '@/hooks/useDealerFollow';
import { useFavorites, useToggleFavorite } from '@/hooks/useFavorites';
import { ListingCard, ListingCardGrid } from '@/components/shared/ListingCard';
import { isRTL, type Locale } from '@/i18n/config';

export default function FavoritesPage() {
  const t = useTranslations('dashboard');
  const locale = useLocale();
  const [activeTab, setActiveTab] = useState<'listings' | 'dealers'>('listings');

  const { data: favorites, isLoading: favoritesLoading } = useFavorites();
  const { toggle } = useToggleFavorite();
  const { data: followedDealers, isLoading: dealersLoading } = useFollowedDealers();

  const rtl = isRTL(locale as Locale);
  const savedListings = favorites ?? [];

  return (
    <div className="p-5 lg:p-7 space-y-5" dir={rtl ? 'rtl' : 'ltr'}>
      <div>
        <h1 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">{t('favorites')}</h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 dark:bg-white/[0.04] rounded-2xl p-1 w-fit">
        <button
          onClick={() => setActiveTab('listings')}
          className={`flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200
            ${activeTab === 'listings'
              ? 'bg-white dark:bg-[var(--ink-750)] text-amber-600 dark:text-amber-400 shadow-sm'
              : 'text-gray-500 dark:text-white/50 hover:text-gray-800 dark:hover:text-white/80'}`}
        >
          <Heart className="w-3.5 h-3.5" />
          {t('savedListings')}
          {savedListings.length > 0 && (
            <span className="text-[10px] rounded-full px-1.5 py-0.5 font-bold bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400">
              {savedListings.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('dealers')}
          className={`flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200
            ${activeTab === 'dealers'
              ? 'bg-white dark:bg-[var(--ink-750)] text-amber-600 dark:text-amber-400 shadow-sm'
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
        favoritesLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <ListingCard key={i} loading locale={locale as Locale} listing={{} as any} />
            ))}
          </div>
        ) : savedListings.length === 0 ? (
          <div className="text-center py-20">
            <Heart className="w-12 h-12 text-gray-300 dark:text-white/20 mx-auto mb-4" aria-hidden />
            <h3 className="font-semibold text-gray-700 dark:text-white/60">{t('noFavorites')}</h3>
            <p className="text-sm text-gray-400 mt-1">{t('noFavoritesDesc')}</p>
            <Link href="/cars" className="text-xs text-amber-600 dark:text-amber-400 font-semibold mt-3 inline-block">
              {t('browseListings')} →
            </Link>
          </div>
        ) : (
          <ListingCardGrid>
            {savedListings.map((fav: any) => (
              <ListingCard
                key={fav.id}
                listing={fav}
                images={fav.images ?? []}
                seller={fav.seller ?? fav.dealer ?? undefined}
                locationLabel={fav.location?.city ?? fav.city}
                locale={locale as Locale}
                saved
                onToggleSave={(_id, next) => toggle(fav, next)}
              />
            ))}
          </ListingCardGrid>
        )
      )}

      {/* Followed Dealers tab */}
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
            {followedDealers.map(({ dealer }) => {
              const name = locale === 'ku' ? dealer.nameKu : locale === 'ar' ? dealer.nameAr : dealer.nameEn;
              const latestListing = dealer.listings?.[0];
              const listingTitle = latestListing
                ? (locale === 'ku' ? latestListing.titleKu : locale === 'ar' ? latestListing.titleAr : latestListing.titleEn)
                : null;

              return (
                <Link
                  key={dealer.id}
                  href={`/dealers/${dealer.slug}`}
                  className="rounded-2xl border border-gray-200 dark:border-white/[0.08] bg-white dark:bg-[var(--ink-750)]
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
                        <Image src={latestListing.images[0].url} alt={listingTitle ?? ''} width={40} height={40} className="rounded-lg object-cover flex-shrink-0" />
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
