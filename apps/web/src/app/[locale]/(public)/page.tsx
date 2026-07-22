// app/[locale]/(public)/page.tsx
import { getTranslations } from 'next-intl/server';
import type { Metadata } from 'next';
import { Suspense, lazy } from 'react';
import { HeroSearch }   from '@/components/features/home/HeroSearch';
import { FeaturedCars } from '@/components/features/home/FeaturedCars';
import { PlatformStats } from '@/components/features/home/PlatformStats';
import { CategoryGrid } from '@/components/features/home/CategoryGrid';
import { TrendingBrandsGrid } from '@/components/features/home/TrendingBrandsGrid';
import { CountryPresence } from '@/components/features/home/CountryPresence';
import { Testimonials } from '@/components/features/home/Testimonials';
import Link from 'next/link';
import { safeJsonLd } from '@/lib/json-ld-safe';

const RecentParts     = lazy(() => import('@/components/features/home/RecentParts').then(m => ({ default: m.RecentParts })));
const FeaturedDealers = lazy(() => import('@/components/features/home/FeaturedDealers').then(m => ({ default: m.FeaturedDealers })));
const AIRecommendations = lazy(() => import('@/components/features/cars/AIRecommendations').then(m => ({ default: m.AIRecommendations })));

type Props = { params: Promise<{ locale: string }> };

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://carsauto.com';

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'meta' });

  const ogLocaleMap: Record<string, string> = {
    ku: 'ckb_IQ', ar: 'ar_IQ', en: 'en_US', zh: 'zh_CN',
  };

  return {
    title: t('homeTitle'),
    description: t('homeDesc'),
    openGraph: {
      type: 'website',
      siteName: 'CarsAuto',
      title: t('homeTitle'),
      description: t('homeDesc'),
      url: `${BASE_URL}/${locale}`,
      locale: ogLocaleMap[locale] ?? 'en_US',
      images: [{ url: `${BASE_URL}/og-default.jpg`, width: 1200, height: 630, alt: t('homeTitle') }],
    },
    twitter: {
      card: 'summary_large_image',
      site: '@CarsAuto',
      title: t('homeTitle'),
      description: t('homeDesc'),
      images: [`${BASE_URL}/og-default.jpg`],
    },
    alternates: {
      canonical: `${BASE_URL}/${locale}`,
    },
  };
}

/* ── Static data ── */
// NOTE: FEATURED_DEALERS, TESTIMONIALS, and PLATFORM_STATS hardcoded arrays
// were removed from here — they showed fabricated dealer ratings, fake
// customer quotes, and made-up platform stats to every visitor. Replaced
// below with the real <FeaturedDealers /> component (GET /dealers), the
// real <PlatformStats /> component (GET /public/stats), and an honest
// removal of the testimonials section pending a real reviews endpoint.
//
// PREMIUM_CATEGORIES/TRENDING_BRANDS were likewise removed — their
// "count"/"listings" figures (e.g. "4,200+", "6,800+") were the same kind
// of fabricated number. Category/brand metadata (icons, colors, labels)
// now lives in <CategoryGrid /> / <TrendingBrandsGrid />, with real counts
// from the new GET /public/stats/categories and GET /public/stats/brands
// endpoints.

export default async function HomePage({ params }: Props) {
  const { locale } = await params;
  const t      = await getTranslations({ locale, namespace: 'home' });

  const itemListJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'CarsAuto Categories',
    url: `${BASE_URL}/${locale}`,
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Cars for Sale', url: `${BASE_URL}/${locale}/cars` },
      { '@type': 'ListItem', position: 2, name: 'Spare Parts',   url: `${BASE_URL}/${locale}/spare-parts` },
      { '@type': 'ListItem', position: 3, name: 'Motorcycles',   url: `${BASE_URL}/${locale}/motorcycles` },
      { '@type': 'ListItem', position: 4, name: 'Find Dealers',  url: `${BASE_URL}/${locale}/dealers` },
    ],
  };

  return (
    <>
      {/* JSON-LD — سەرەوە دانراوە بۆ SSR باش */}
      {/* safeJsonLd (not JSON.stringify) — prevents </script> breakout XSS if this list ever includes dynamic/user-controlled data */}
      <script
        id="jsonld-itemlist"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(itemListJsonLd) }}
      />

      {/* 01 · HERO */}
      <HeroSearch />

      {/* 02 · STATS BANNER — real counts from GET /public/stats, not hardcoded */}
      <PlatformStats />

      {/* 02b · COUNTRY PRESENCE — real Iraq count, honest "Coming Soon" for UAE/China */}
      <CountryPresence />

      {/* 03 · PREMIUM CATEGORIES */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
        <div className="text-center mb-12">
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold tracking-[0.14em] uppercase bg-[var(--gold-subtle)] border border-[rgba(201,168,76,0.25)] text-[var(--gold)] mb-5">● {t('categoryEyebrow')}</span>
          <h2 className="text-3xl sm:text-4xl font-black text-[var(--text-primary)] leading-tight">
            {t('categoryTitle')}
          </h2>
          <p className="text-[var(--text-muted)] mt-3 max-w-lg mx-auto">{t('categorySubtitle')}</p>
        </div>
        <CategoryGrid />
      </section>

      {/* 04 · FEATURED CARS */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-14">
        <div className="flex items-end justify-between mb-10 gap-4">
          <div>
            <span className="inline-flex items-center gap-2 text-[var(--gold)] text-xs font-bold tracking-[0.14em] uppercase mb-2">
              <span className="w-6 h-px bg-[var(--gold)]" />{t('featuredEyebrow')}
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-[var(--text-primary)]">{t('featuredCars')}</h2>
          </div>
          <Link href="/cars" className="hidden sm:inline-flex items-center gap-2 text-sm font-bold text-[var(--gold)] hover:text-[var(--gold-light)] transition-colors duration-200 whitespace-nowrap px-4 py-2 rounded-xl border border-[rgba(201,168,76,0.25)] hover:border-[rgba(201,168,76,0.5)] hover:bg-[rgba(201,168,76,0.06)]">
            {t('viewAll')} →
          </Link>
        </div>
        <FeaturedCars />
      </section>

      {/* 04.5 · AI RECOMMENDATIONS — personalised picks, client-only */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-14">
        <Suspense fallback={<div className="h-48 skeleton rounded-2xl" />}>
          <AIRecommendations apiBaseUrl={process.env.NEXT_PUBLIC_API_URL} locale={locale} />
        </Suspense>
      </section>

      {/* 05 · TRENDING BRANDS */}
      <section className="relative overflow-hidden py-16 sm:py-24"
               style={{ background: 'linear-gradient(180deg, transparent 0%, rgba(5,11,20,0.6) 30%, rgba(5,11,20,0.6) 70%, transparent 100%)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-end justify-between mb-10">
            <div>
              <span className="inline-flex items-center gap-2 text-[var(--gold)] text-xs font-bold tracking-[0.14em] uppercase mb-2">
                <span className="w-6 h-px bg-[var(--gold)]" />{t('trendingBrandsEyebrow')}
              </span>
              <h2 className="text-2xl sm:text-3xl font-black text-[var(--text-primary)]">
                {t('trendingBrandsTitle')}
              </h2>
            </div>
            <Link href="/cars" className="hidden sm:inline-flex items-center gap-2 text-sm font-bold text-[var(--gold)] hover:text-[var(--gold-light)] transition-colors whitespace-nowrap px-4 py-2 rounded-xl border border-[rgba(201,168,76,0.25)] hover:border-[rgba(201,168,76,0.5)] hover:bg-[rgba(201,168,76,0.06)]">
              {t('allBrands')} →
            </Link>
          </div>
          <TrendingBrandsGrid />
        </div>
      </section>

      {/* 06 · SPARE PARTS */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-14">
        <div className="flex items-end justify-between mb-10 gap-4">
          <div>
            <span className="inline-flex items-center gap-2 text-[var(--gold)] text-xs font-bold tracking-[0.14em] uppercase mb-2">
              <span className="w-6 h-px bg-[var(--gold)]" />{t('partsEyebrow')}
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-[var(--text-primary)]">{t('recentParts')}</h2>
          </div>
          <Link href="/spare-parts" className="hidden sm:inline-flex items-center gap-2 text-sm font-bold text-[var(--gold)] hover:text-[var(--gold-light)] transition-colors whitespace-nowrap px-4 py-2 rounded-xl border border-[rgba(201,168,76,0.25)] hover:border-[rgba(201,168,76,0.5)] hover:bg-[rgba(201,168,76,0.06)]">
            {t('viewAll')} →
          </Link>
        </div>
        <Suspense fallback={<div className="h-48 skeleton rounded-2xl" />}>
          <RecentParts />
        </Suspense>
      </section>

      {/* 07 · FEATURED DEALERS — real data from GET /dealers, not hardcoded */}
      <Suspense fallback={<div className="h-64 skeleton rounded-2xl mx-4 sm:mx-6 lg:mx-8" />}>
        <FeaturedDealers locale={locale} />
      </Suspense>

      {/* 08 · TESTIMONIALS — real reviews from GET /reviews/featured.
          Self-hides if there isn't enough real, qualifying review data yet. */}
      <Testimonials />

      {/* 09 · SELL CTA */}
      <section className="mx-4 sm:mx-6 lg:mx-8 mb-8">
        <div className="relative rounded-[var(--r-3xl)] overflow-hidden py-12 sm:py-16 text-center"
             style={{ background: 'linear-gradient(135deg, #050d1a 0%, #0b1929 40%, var(--ink-700) 50%, #0b1929 60%, #050d1a 100%)' }}>
          {/* Ambient dot texture */}
          <div className="absolute inset-0 pointer-events-none opacity-[0.04]"
               style={{ backgroundImage: 'radial-gradient(circle,rgba(201,168,76,1) 1px,transparent 1px)', backgroundSize: '28px 28px' }} />
          {/* Radial gold bloom behind the headline for stronger visual impact */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[560px] h-[280px] pointer-events-none"
               style={{ background: 'radial-gradient(ellipse, rgba(201,168,76,0.16) 0%, transparent 70%)' }} />
          {/* Top accent line */}
          <div className="absolute top-0 inset-x-0 h-0.5"
               style={{ background: 'linear-gradient(90deg, transparent, var(--gold), transparent)' }} />
          {/* Corner brackets — small decorative touch that reads as "premium promo panel" */}
          <div className="hidden sm:block absolute top-6 start-6 w-8 h-8 border-t-2 border-s-2 border-gold/25 rounded-tl-lg pointer-events-none" />
          <div className="hidden sm:block absolute bottom-6 end-6 w-8 h-8 border-b-2 border-e-2 border-gold/25 rounded-br-lg pointer-events-none" />

          <div className="relative px-8 space-y-4">
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold tracking-[0.14em] uppercase bg-[var(--gold-subtle)] border border-[rgba(201,168,76,0.25)] text-[var(--gold)]">● {t('sellCTAEyebrow')}</span>
            <h2 className="text-3xl sm:text-5xl font-black text-white leading-[1.08] tracking-tight">{t('sellCTATitle')}</h2>
            <p className="text-white/50 max-w-md mx-auto text-sm sm:text-base">{t('sellCTASubtitle')}</p>
            <div className="flex flex-wrap gap-3 justify-center pt-3">
              <Link href="/dashboard/listings/new"
                className="cta-sheen relative overflow-hidden px-10 py-4 rounded-xl text-sm sm:text-base font-black uppercase tracking-wide text-[var(--ink-900)] shadow-[0_8px_32px_rgba(201,168,76,0.45)] hover:shadow-[0_14px_52px_rgba(201,168,76,0.65)] hover:-translate-y-1 active:scale-[0.98] active:translate-y-0 transition-all duration-200"
                style={{ background: 'linear-gradient(135deg, #a87828 0%, var(--gold) 50%, #dab445 100%)' }}>
                {t('sellCTAButton')} →
              </Link>
              <Link href="/cars"
                className="px-8 py-4 rounded-xl text-sm font-bold text-white/70 border border-white/15 hover:border-white/35 hover:text-white hover:bg-white/[0.04] transition-all duration-200">
                {t('browseAll')}
              </Link>
            </div>
          </div>

          <style>{`
            @keyframes ctaSheen{0%{background-position:-160% 0}100%{background-position:160% 0}}
            .cta-sheen{background-image:linear-gradient(115deg, transparent 20%, rgba(255,255,255,0.30) 38%, rgba(255,255,255,0.5) 45%, transparent 60%);background-size:220% 100%;animation:ctaSheen 3.4s ease-in-out 1s infinite}
            @media (prefers-reduced-motion: reduce){ .cta-sheen{ animation:none } }
          `}</style>
        </div>
      </section>
    </>
  );
}