// app/[locale]/(public)/page.tsx
import { getTranslations } from 'next-intl/server';
import type { Metadata } from 'next';
import { Suspense, lazy } from 'react';
import { HeroSearch }   from '@/components/features/home/HeroSearch';
import { FeaturedCars } from '@/components/features/home/FeaturedCars';
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
const PREMIUM_CATEGORIES = [
  { id: 'sedan',    icon: '🚗', label: 'سیدان',       labelEn: 'Sedan',       count: '4,200+', color: '#3b82f6' },
  { id: 'suv',      icon: '🚙', label: 'SUV',          labelEn: 'SUV / 4×4',   count: '6,800+', color: 'var(--gold)' },
  { id: 'luxury',   icon: '💎', label: 'لوکس',         labelEn: 'Luxury',      count: '1,500+', color: '#a855f7' },
  { id: 'electric', icon: '⚡', label: 'کارەبایی',     labelEn: 'Electric',    count: '820+',   color: '#10b981' },
  { id: 'pickup',   icon: '🛻', label: 'پیکەپ',        labelEn: 'Pickup',      count: '2,100+', color: '#ef4444' },
  { id: 'parts',    icon: '⚙️', label: 'پارچەکان',     labelEn: 'Parts',       count: '18,000+',color: '#f97316' },
] as const;

const TRENDING_BRANDS = [
  { name: 'Toyota',   logoText: 'T',   color: '#eb0a1e', listings: '5,200+' },
  { name: 'BMW',      logoText: 'BMW', color: '#1c69d3', listings: '2,800+' },
  { name: 'Mercedes', logoText: '★',   color: '#c0c0c0', listings: '2,400+' },
  { name: 'Lexus',    logoText: 'L',   color: '#1a1a2e', listings: '1,900+' },
  { name: 'KIA',      logoText: 'K',   color: '#05141f', listings: '3,100+' },
  { name: 'Hyundai',  logoText: 'H',   color: '#002c5f', listings: '2,700+' },
  { name: 'BYD',      logoText: 'BYD', color: '#1db954', listings: '1,200+' },
  { name: 'Nissan',   logoText: 'N',   color: '#c3002f', listings: '2,100+' },
] as const;

const FEATURED_DEALERS = [
  { id: 1, name: 'Al-Najaf Premium Auto',  nameKu: 'ئەل-نەجەف پریمیئوم ئۆتۆ', city: 'Erbil',          rating: 4.9, reviews: 284, listings: 142, verified: true, specialty: 'Luxury & Premium',   badge: '💎 Platinum Dealer' },
  { id: 2, name: 'Kurdistan Motors',       nameKu: 'کوردستان مۆتۆرز',          city: 'Sulaymaniyah',   rating: 4.8, reviews: 196, listings: 98,  verified: true, specialty: 'Toyota & Lexus',     badge: '⭐ Top Rated' },
  { id: 3, name: 'Gulf Star Autos',        nameKu: 'گولف ستار ئۆتۆز',          city: 'Dubai',          rating: 4.9, reviews: 421, listings: 213, verified: true, specialty: 'Import Specialist',  badge: '🌟 Gold Dealer' },
  { id: 4, name: 'Tigris Auto Group',      nameKu: 'تیگریس ئۆتۆ گروپ',         city: 'Baghdad',        rating: 4.7, reviews: 158, listings: 87,  verified: true, specialty: 'All Brands',         badge: '✅ Verified' },
] as const;

const TESTIMONIALS = [
  { id: 1, name: 'Ahmad Al-Rashidi', city: 'Erbil',          rating: 5, text: 'Found my dream Land Cruiser within 24 hours. The platform is incredibly fast and the dealers are genuine. Best car marketplace in the region by far.', car: 'Toyota Land Cruiser 2023', avatar: '👨' },
  { id: 2, name: 'Sara Karim',       city: 'Sulaymaniyah',   rating: 5, text: 'Sold my BMW in 3 days! The listing process was simple, secure, and I got the price I wanted. Will definitely use again.',                              car: 'BMW 5 Series 2022',        avatar: '👩' },
  { id: 3, name: 'Mohammed Hassan',  city: 'Baghdad',         rating: 5, text: 'The verified dealer system gives me confidence. Bought 2 cars through this platform and both experiences were perfect.',                              car: 'Mercedes GLE 2022',        avatar: '👨‍💼' },
] as const;

const PLATFORM_STATS = [
  { value: '24,000', suffix: '+', label: 'چالاک لیستینگ',    labelEn: 'Active Listings',   icon: '🚗' },
  { value: '1,200',  suffix: '+', label: 'دیلەری دڵنیاکراو', labelEn: 'Verified Dealers',  icon: '🏪' },
  { value: '98',     suffix: '%', label: 'دڵنیایی کڕینەوە',  labelEn: 'Satisfaction Rate', icon: '⭐' },
  { value: '48',     suffix: 'h', label: 'مامناوەند فرۆشتن',  labelEn: 'Avg. Time to Sell', icon: '⚡' },
  { value: '8',      suffix: '',  label: 'شار',               labelEn: 'Cities Covered',    icon: '📍' },
  { value: '50,000', suffix: '+', label: 'کڕیاری بەکارهێنر',  labelEn: 'Happy Customers',   icon: '🤝' },
] as const;

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

      {/* 02 · STATS BANNER */}
      <div className="relative overflow-hidden border-y border-[rgba(201,168,76,0.15)] shadow-[inset_0_1px_0_rgba(201,168,76,0.06),inset_0_-1px_0_rgba(201,168,76,0.06)]"
           style={{ background: 'linear-gradient(90deg, var(--ink-900) 0%, var(--ink-800) 50%, var(--ink-900) 100%)' }}>
        <div className="absolute inset-0 opacity-[0.03]"
             style={{ backgroundImage: 'radial-gradient(circle, rgba(201,168,76,1) 1px, transparent 1px)', backgroundSize: '32px 32px' }} />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-6">
            {PLATFORM_STATS.map(({ value, suffix, label, labelEn, icon }, i) => (
              <div key={labelEn} className="text-center stat-animate" style={{ animationDelay: `${i * 0.1}s` }}>
                <div className="text-2xl mb-1">{icon}</div>
                <div className="text-2xl sm:text-3xl font-black tabular-nums leading-none"
                  style={{ background: 'linear-gradient(135deg, var(--gold-bright) 0%, var(--gold) 60%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                  {value}<span className="text-lg">{suffix}</span>
                </div>
                <div className="text-white/50 text-xs mt-1 leading-tight">
                  {label}<br /><span className="text-white/25">{labelEn}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
        <style>{`
          @keyframes statReveal { from { opacity:0; transform:translateY(16px) } to { opacity:1; transform:translateY(0) } }
          .stat-animate { animation: statReveal 0.6s cubic-bezier(0.16,1,0.3,1) both }
        `}</style>
      </div>

      {/* 02b · COUNTRY PRESENCE */}
      <div className="border-b border-white/[0.04]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
          <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-5">
            <span className="text-[10px] uppercase tracking-[0.18em] text-white/20 font-black hidden sm:block">
              Serving
            </span>
            {[
              { flag: '🇮🇶', name: 'Iraq & Kurdistan', count: '18,000+', detail: 'Baghdad · Erbil · Sulaymaniyah · Kirkuk · Duhok' },
              { flag: '🇦🇪', name: 'UAE',              count: '4,500+',  detail: 'Dubai · Sharjah · Abu Dhabi' },
              { flag: '🇨🇳', name: 'China',            count: '1,800+',  detail: 'Import · Export · BYD · Geely' },
            ].map(({ flag, name, count, detail }) => (
              <div key={name}
                className="flex items-center gap-3 px-4 py-2.5 rounded-xl
                           border border-white/[0.06] bg-white/[0.02]
                           hover:border-[rgba(201,168,76,0.2)] hover:bg-[rgba(201,168,76,0.03)]
                           transition-all duration-200 cursor-default">
                <span className="text-2xl">{flag}</span>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-white/70">{name}</span>
                    <span className="text-[10px] font-black text-[var(--gold)] bg-[var(--gold-subtle)] px-1.5 py-0.5 rounded-full">{count}</span>
                  </div>
                  <div className="text-[9px] text-white/25 mt-0.5 hidden sm:block">{detail}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 03 · PREMIUM CATEGORIES */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
        <div className="text-center mb-12">
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold tracking-[0.14em] uppercase bg-[var(--gold-subtle)] border border-[rgba(201,168,76,0.25)] text-[var(--gold)] mb-5">● Browse by Category</span>
          <h2 className="text-3xl sm:text-4xl font-black text-[var(--text-primary)] leading-tight">
            دۆزینەوە بە{' '}<span className="text-[var(--gold)]">جۆر</span>
          </h2>
          <p className="text-[var(--text-muted)] mt-3 max-w-lg mx-auto">Explore thousands of listings across every vehicle category</p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {PREMIUM_CATEGORIES.map(({ id, icon, label, labelEn, count, color }) => (
            <Link key={id}
              href="/${id === 'parts' ? 'spare-parts' : 'cars'}?category=${id}"
              className="group relative rounded-2xl overflow-hidden cursor-pointer border border-white/[0.07] hover:border-[rgba(201,168,76,0.4)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_20px_60px_rgba(0,0,0,0.4)]"
              style={{ background: 'linear-gradient(145deg, rgba(11,21,37,0.9), rgba(8,15,28,0.95))' }}>
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                   style={{ background: `radial-gradient(circle at 50% 0%, ${color}18 0%, transparent 70%)` }} />
              <div className="relative p-5 text-center">
                <div className="text-4xl mb-3 transition-all duration-400 group-hover:scale-125 group-hover:-rotate-6 group-hover:drop-shadow-lg">{icon}</div>
                <div className="font-bold text-white text-sm mb-0.5">{label}</div>
                <div className="text-white/40 text-[10px]">{labelEn}</div>
                <div className="mt-3 text-[10px] font-bold px-2 py-0.5 rounded-full inline-block"
                     style={{ color, background: `${color}15`, border: `1px solid ${color}35`, boxShadow: `0 2px 8px ${color}15` }}>{count}</div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* 04 · FEATURED CARS */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10">
        <div className="flex items-end justify-between mb-8 gap-4">
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
        {newFunction()}
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
                <span className="w-6 h-px bg-[var(--gold)]" />Trending Brands
              </span>
              <h2 className="text-2xl sm:text-3xl font-black text-[var(--text-primary)]">
                براندی{' '}<span className="text-[var(--gold)]">گەرم</span>
              </h2>
            </div>
            <Link href="/cars" className="hidden sm:inline-flex items-center gap-2 text-sm font-bold text-[var(--gold)] hover:text-[var(--gold-light)] transition-colors whitespace-nowrap px-4 py-2 rounded-xl border border-[rgba(201,168,76,0.25)] hover:border-[rgba(201,168,76,0.5)] hover:bg-[rgba(201,168,76,0.06)]">
              All Brands →
            </Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
            {TRENDING_BRANDS.map(({ name, logoText, color, listings }) => (
              <Link key={name} href="/cars?make=${name}"
                className="group relative rounded-xl overflow-hidden cursor-pointer border border-white/[0.07] hover:border-[rgba(201,168,76,0.4)] transition-all duration-300 hover:-translate-y-1"
                style={{ background: 'linear-gradient(145deg, rgba(11,21,37,0.9), rgba(8,15,28,0.95))' }}>
                <div className="relative p-4 text-center">
                  <div className="w-12 h-12 rounded-full mx-auto mb-3 flex items-center justify-center text-white text-xs font-black border-2 transition-all duration-300 group-hover:scale-110"
                       style={{ background: `${color}18`, borderColor: `${color}45`, color, boxShadow: `0 4px 12px ${color}20` }}>
                    {logoText}
                  </div>
                  <div className="font-bold text-white text-xs mb-1">{name}</div>
                  <div className="text-white/35 text-[9px]">{listings}</div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* 06 · SPARE PARTS */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-14">
        <div className="flex items-end justify-between mb-8 gap-4">
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

      {/* 07 · FEATURED DEALERS */}
      <section className="relative overflow-hidden py-16 sm:py-24">
        <div className="absolute inset-0 opacity-[0.025]"
             style={{ backgroundImage: 'radial-gradient(circle, rgba(201,168,76,0.6) 1px, transparent 1px)', backgroundSize: '36px 36px' }} />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold tracking-[0.14em] uppercase bg-[var(--gold-subtle)] border border-[rgba(201,168,76,0.25)] text-[var(--gold)] mb-5">● Featured Dealers</span>
            <h2 className="text-3xl sm:text-4xl font-black text-[var(--text-primary)]">
              دیلەری{' '}<span className="text-[var(--gold)]">پشتیوانیکراو</span>
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {FEATURED_DEALERS.map((dealer) => (
              <div key={dealer.id}
                   className="group relative rounded-2xl overflow-hidden cursor-pointer border border-white/[0.07] hover:border-[rgba(201,168,76,0.4)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_24px_60px_rgba(0,0,0,0.5)]"
                   style={{ background: 'linear-gradient(145deg, rgba(11,21,37,0.9), rgba(8,15,28,0.95))' }}>
                <div className="absolute top-0 inset-x-0 h-[2px] opacity-0 group-hover:opacity-100 transition-opacity duration-350" style={{ background: 'linear-gradient(90deg, transparent, var(--gold), var(--gold-bright), var(--gold), transparent)' }} />
                <div className="p-6">
                  <div className="w-16 h-16 rounded-2xl mb-4 flex items-center justify-center text-2xl bg-gradient-to-br from-[rgba(201,168,76,0.2)] to-[rgba(201,168,76,0.05)] border border-[rgba(201,168,76,0.2)]">🏪</div>
                  <div className="text-[10px] font-bold text-[rgba(201,168,76,0.8)] mb-2">{dealer.badge}</div>
                  <h3 className="font-bold text-white text-sm mb-0.5">{dealer.name}</h3>
                  <p className="text-white/40 text-xs mb-4">{dealer.city} · {dealer.specialty}</p>
                  <div className="flex gap-3 mb-4">
                    <div className="flex-1 text-center rounded-xl py-2 bg-white/[0.04] border border-white/[0.06]">
                      <div className="font-black text-[var(--gold)] text-base">{dealer.rating}★</div>
                      <div className="text-white/30 text-[9px]">{dealer.reviews} reviews</div>
                    </div>
                    <div className="flex-1 text-center rounded-xl py-2 bg-white/[0.04] border border-white/[0.06]">
                      <div className="font-black text-white text-base">{dealer.listings}</div>
                      <div className="text-white/30 text-[9px]">listings</div>
                    </div>
                  </div>
                  <Link href={`/dealers/${dealer.id}`}
                    className="block text-center text-xs font-bold py-2.5 rounded-xl border border-[rgba(201,168,76,0.3)] text-[var(--gold)] hover:bg-[var(--gold-subtle)] hover:border-[rgba(201,168,76,0.6)] transition-all duration-200">
                    View Dealer →
                  </Link>
                </div>
              </div>
            ))}
          </div>
          <div className="text-center mt-8">
            <Link href="/dealers" className="inline-flex items-center gap-2 px-8 py-3 rounded-xl text-sm font-bold border border-white/15 text-white/60 hover:text-white hover:border-white/30 transition-all duration-200">
              View All Dealers →
            </Link>
          </div>
        </div>
      </section>

      {/* 08 · TESTIMONIALS */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
        <div className="text-center mb-12">
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold tracking-[0.14em] uppercase bg-[var(--gold-subtle)] border border-[rgba(201,168,76,0.25)] text-[var(--gold)] mb-5">● Customer Reviews</span>
          <h2 className="text-3xl sm:text-4xl font-black text-[var(--text-primary)]">
            دەستەوێژی{' '}<span className="text-[var(--gold)]">کڕیارەکانمان</span>
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {TESTIMONIALS.map((testimonial) => (
            <div key={testimonial.id}
                 className="group relative rounded-2xl p-6 overflow-hidden border border-white/[0.07] hover:border-[rgba(201,168,76,0.3)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_20px_60px_rgba(0,0,0,0.45),0_0_0_1px_rgba(201,168,76,0.06)]"
                 style={{ background: 'linear-gradient(145deg, rgba(11,21,37,0.85), rgba(8,15,28,0.9))' }}>
              <div className="absolute top-4 end-4 text-5xl text-[var(--gold-subtle)] font-serif leading-none select-none">"</div>
              <div className="flex gap-0.5 mb-4">
                {Array.from({ length: testimonial.rating }).map((_, si) => (
                  <span key={si} className="text-[var(--gold)] text-sm">★</span>
                ))}
              </div>
              <p className="text-white/70 text-sm leading-relaxed mb-4" dir="ltr">{testimonial.text}</p>
              <div className="h-px bg-white/[0.06] mb-4" />
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[rgba(201,168,76,0.2)] to-[rgba(201,168,76,0.05)] border border-[rgba(201,168,76,0.2)] flex items-center justify-center text-xl">
                  {testimonial.avatar}
                </div>
                <div>
                  <div className="font-semibold text-white text-sm">{testimonial.name}</div>
                  <div className="text-white/40 text-[10px]">{testimonial.city} · {testimonial.car}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 09 · SELL CTA */}
      <section className="mx-4 sm:mx-6 lg:mx-8 mb-8">
        <div className="relative rounded-3xl overflow-hidden py-14 sm:py-20 text-center"
             style={{ background: 'linear-gradient(135deg, #050d1a 0%, #0b1929 40%, var(--ink-700) 50%, #0b1929 60%, #050d1a 100%)' }}>
          <div className="absolute inset-0 pointer-events-none opacity-[0.04]"
               style={{ backgroundImage: 'radial-gradient(circle,rgba(201,168,76,1) 1px,transparent 1px)', backgroundSize: '28px 28px' }} />
          <div className="absolute top-0 inset-x-0 h-0.5"
               style={{ background: 'linear-gradient(90deg, transparent, var(--gold), transparent)' }} />
          <div className="relative px-8 space-y-5">
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold tracking-[0.14em] uppercase bg-[var(--gold-subtle)] border border-[rgba(201,168,76,0.25)] text-[var(--gold)]">● Sell Your Car</span>
            <h2 className="text-3xl sm:text-4xl font-black text-white">{t('sellCTATitle')}</h2>
            <p className="text-white/50 max-w-md mx-auto text-sm">{t('sellCTASubtitle')}</p>
            <div className="flex flex-wrap gap-3 justify-center pt-2">
              <Link href="/dashboard/listings/new"
                className="px-8 py-3.5 rounded-xl text-sm font-black text-[var(--ink-900)] shadow-[0_6px_28px_rgba(201,168,76,0.45)] hover:shadow-[0_10px_48px_rgba(201,168,76,0.65)] hover:-translate-y-1 active:scale-[0.98] active:translate-y-0 transition-all duration-200"
                style={{ background: 'linear-gradient(135deg, #a87828 0%, var(--gold) 50%, #dab445 100%)' }}>
                {t('sellCTAButton')} →
              </Link>
              <Link href="/cars"
                className="px-8 py-3.5 rounded-xl text-sm font-bold text-white/70 border border-white/15 hover:border-white/30 hover:text-white transition-all duration-200">
                {t('browseAll')}
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );

  function newFunction() {
    return <FeaturedCars />;
  }
}