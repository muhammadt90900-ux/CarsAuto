'use client';
// apps/web/src/app/[locale]/not-found.tsx
//
// Previously missing entirely — an unmatched URL (typo, stale bookmark, or
// one of the footer's broken links before that fix) fell through to
// Next.js's default unbranded blank 404 instead of anything matching the
// rest of the app's design language.
//
// This lives under app/[locale]/, so it's still wrapped by the locale
// layout's <NextIntlClientProvider> — useTranslations works normally here,
// unlike a truly global not-found.tsx would.

import { useTranslations, useLocale } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { Search, Home, Car, Wrench } from 'lucide-react';
import { isRTL, type Locale } from '@/i18n/config';

export default function NotFound() {
  const t = useTranslations('errors');
  const tc = useTranslations('common');
  const locale = useLocale();
  const rtl = isRTL(locale as Locale);

  return (
    <div dir={rtl ? 'rtl' : 'ltr'} className="min-h-screen flex items-center justify-center px-4 bg-white dark:bg-[var(--ink-900)]">
      <div className="max-w-md w-full text-center">
        <div className="text-7xl font-display font-black mb-2"
             style={{ background: 'linear-gradient(135deg, var(--gold), #9e6e1e)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          404
        </div>
        <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
          {t('notFound')}
        </h1>
        <p className="text-gray-500 dark:text-white/50 text-sm mb-8">
          {t('notFoundDesc')}
        </p>

        <div className="grid grid-cols-2 gap-3 mb-8">
          <Link href="/"
            className="flex items-center gap-2 justify-center h-11 rounded-xl text-sm font-semibold
                       border border-gray-200 dark:border-white/10 text-gray-700 dark:text-white/70
                       hover:border-[var(--gold)] hover:text-[var(--gold)] transition-colors duration-200">
            <Home className="w-4 h-4" aria-hidden />
            {tc('home')}
          </Link>
          <Link href="/cars"
            className="flex items-center gap-2 justify-center h-11 rounded-xl text-sm font-semibold
                       border border-gray-200 dark:border-white/10 text-gray-700 dark:text-white/70
                       hover:border-[var(--gold)] hover:text-[var(--gold)] transition-colors duration-200">
            <Car className="w-4 h-4" aria-hidden />
            {tc('cars')}
          </Link>
          <Link href="/spare-parts"
            className="flex items-center gap-2 justify-center h-11 rounded-xl text-sm font-semibold
                       border border-gray-200 dark:border-white/10 text-gray-700 dark:text-white/70
                       hover:border-[var(--gold)] hover:text-[var(--gold)] transition-colors duration-200">
            <Wrench className="w-4 h-4" aria-hidden />
            {tc('spareParts')}
          </Link>
          <Link href="/dealers"
            className="flex items-center gap-2 justify-center h-11 rounded-xl text-sm font-semibold
                       border border-gray-200 dark:border-white/10 text-gray-700 dark:text-white/70
                       hover:border-[var(--gold)] hover:text-[var(--gold)] transition-colors duration-200">
            <Search className="w-4 h-4" aria-hidden />
            {tc('dealers')}
          </Link>
        </div>

        <Link href="/"
          className="inline-flex items-center justify-center h-11 px-8 rounded-xl font-bold text-sm
                     text-[var(--ink-900)] transition-all duration-200 hover:-translate-y-0.5"
          style={{ background: 'linear-gradient(135deg, #a87828 0%, var(--gold) 50%, #dab445 100%)', boxShadow: '0 4px 20px rgba(201,168,76,0.35)' }}>
          {t('goHome')}
        </Link>
      </div>
    </div>
  );
}
