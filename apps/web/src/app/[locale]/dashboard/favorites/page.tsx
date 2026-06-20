'use client';
// app/[locale]/dashboard/favorites/page.tsx — Fully localized

import { useTranslations } from 'next-intl';
import { Heart } from 'lucide-react';

export default function FavoritesPage() {
  const t = useTranslations('dashboard');

  // TODO: fetch real favorites from API
  const favorites: any[] = [];

  return (
    <div className="p-5 lg:p-7 space-y-5">
      <div>
        <h1 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">{t('favorites')}</h1>
      </div>

      {favorites.length === 0 ? (
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
      )}
    </div>
  );
}
