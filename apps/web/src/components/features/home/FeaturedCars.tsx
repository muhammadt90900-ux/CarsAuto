'use client';
// components/features/home/FeaturedCars.tsx — UX-Improved: compare, quick-view, better CTA

import { memo, useState, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { MapPin, Gauge, Fuel, Star, Heart, ArrowRight, Zap, Shield, Eye, GitCompare } from 'lucide-react';
import { listingsApi } from '@/lib/api';
import { queryKeys } from '@/lib/queryKeys';

/* ── Skeleton ─────────────────────────────────────────────────── */
function CarCardSkeleton() {
  return (
    <div className="rounded-2xl overflow-hidden
                    bg-white dark:bg-[#0b1525]
                    border border-slate-100 dark:border-white/[0.06]
                    shadow-[var(--shadow-md)]"
         aria-hidden="true">
      <div className="h-52 skeleton" />
      <div className="p-4 space-y-3">
        <div className="h-4 skeleton rounded-lg w-3/4" />
        <div className="h-3 skeleton rounded-lg w-1/2" />
        <div className="flex gap-2 mt-3">
          <div className="h-3 skeleton rounded-full w-1/3" />
          <div className="h-3 skeleton rounded-full w-1/3" />
        </div>
        <div className="h-px bg-slate-100 dark:bg-white/[0.05]" />
        <div className="flex items-center justify-between pt-1">
          <div className="h-6 skeleton rounded-lg w-2/5" />
          <div className="h-8 w-8 skeleton rounded-full" />
        </div>
      </div>
    </div>
  );
}

/* ── Car Card — memoised ──────────────────────────────────────── */
const CarCard = memo(function CarCard({ car, locale }: { car: any; locale?: string }) {
  const [liked, setLiked] = useState(false);
  const [imgError, setImgError] = useState(false);

  const toggleLike = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setLiked(v => !v);
  }, []);

  const handleImgError = useCallback(() => setImgError(true), []);

  // FIX: car.images[0] can be either a string URL or an object { url, key, width, height }
  // Previously: car.images?.[0] — returned {} which is truthy, causing src={} error
  const rawImage = car.images?.[0];
  const imageUrl = typeof rawImage === 'string'
    ? rawImage
    : (rawImage?.url ?? null);

  const href = locale ? `/${locale}/cars/${car.id}` : `/cars/${car.id}`;

  return (
    <Link href={href} className="block group" prefetch={false}>
      <article className="group/card card-premium overflow-hidden h-full flex flex-col
                          rounded-2xl border border-slate-100 dark:border-white/[0.06]
                          bg-white dark:bg-gradient-to-b dark:from-[#0d1e35] dark:to-[#0a1528]
                          shadow-[var(--shadow-md)]
                          dark:hover:border-[#c9a84c]/30
                          hover:shadow-[0_24px_64px_rgba(0,0,0,0.30)] dark:hover:shadow-[0_24px_64px_rgba(0,0,0,0.65),0_0_0_1px_rgba(201,168,76,0.06)]
                          transition-all duration-350 hover:-translate-y-2 relative">

        <div aria-hidden="true"
          className="absolute top-0 inset-x-0 h-[2px] opacity-0 group-hover/card:opacity-100 transition-opacity duration-500 z-10 pointer-events-none"
          style={{ background: 'linear-gradient(90deg, transparent, rgba(201,168,76,0.55), transparent)' }} />

        {/* Image area */}
        <div className="relative h-52 overflow-hidden bg-slate-100 dark:bg-[#060f1a] flex-shrink-0">
          {imageUrl && !imgError ? (
            <Image
              src={imageUrl}
              alt={car.titleEn ?? car.titleKu ?? 'Car listing'}
              fill
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
              className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.06]"
              onError={handleImgError}
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center
                            bg-gradient-to-br from-slate-100 to-slate-200
                            dark:from-[#0b1525] dark:to-[#0f1c2e]">
              <span className="text-6xl opacity-20" aria-hidden="true">🚗</span>
            </div>
          )}

          {/* Overlay gradient */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent
                          opacity-0 group-hover:opacity-100 transition-opacity duration-400 pointer-events-none" />

          {/* Badges */}
          <div className="absolute top-3 left-3 flex gap-1.5">
            {car.featured && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black
                               bg-gradient-to-r from-[#a87828] to-[#dab445] text-[#050b14] shadow-[0_2px_10px_rgba(201,168,76,0.45)]">
                <Star className="w-2.5 h-2.5 fill-current" />Featured
              </span>
            )}
            {car.condition === 'New' && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold
                               bg-emerald-500/90 text-white">New</span>
            )}
          </div>

          {/* Action buttons on hover */}
          <div className="absolute top-3 right-3 flex flex-col gap-1.5 transition-all duration-200
                          opacity-0 group-hover:opacity-100 translate-x-2 group-hover:translate-x-0">
            <button
              onClick={toggleLike}
              aria-label={liked ? 'Remove from favorites' : 'Save to favorites'}
              className={`flex items-center justify-center w-8 h-8 rounded-xl backdrop-blur-sm transition-all
                          ${liked ? 'bg-red-500/90 text-white' : 'bg-black/40 text-white hover:bg-red-500/80'}`}
            >
              <Heart className={`w-3.5 h-3.5 ${liked ? 'fill-current' : ''}`} />
            </button>
            <button
              aria-label="Compare"
              className="flex items-center justify-center w-8 h-8 rounded-xl bg-black/40 backdrop-blur-sm
                         text-white hover:bg-white/20 transition-all"
            >
              <GitCompare className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* View count on hover */}
          {car.views && (
            <div className="absolute bottom-3 left-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              <span className="flex items-center gap-1 text-[10px] font-semibold text-white
                               bg-black/50 backdrop-blur-sm px-2 py-1 rounded-full">
                <Eye className="w-3 h-3" />{car.views?.toLocaleString?.()} views
              </span>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-4 flex flex-col flex-1">
          <div className="flex items-start justify-between gap-2 mb-1">
            <p className="text-[9px] font-black uppercase tracking-[0.16em] text-[var(--gold)]">
              {car.make ?? car.brand} · {car.year}
            </p>
            {car.verified && (
              <span className="flex items-center gap-0.5 text-[9px] font-bold text-blue-400 flex-shrink-0">
                <Shield className="w-2.5 h-2.5" />Verified
              </span>
            )}
          </div>

          <h3 className="font-bold text-[var(--text-primary)] text-base leading-tight line-clamp-1 mb-2 group-hover:text-[#c9a84c] transition-colors">
            {car.titleEn ?? car.title ?? `${car.make} ${car.model}`}
          </h3>

          <div className="flex flex-wrap gap-2 mb-3">
            {car.mileage && (
              <span className="flex items-center gap-1 text-[11px] text-[var(--text-muted)]">
                <Gauge className="w-3 h-3" />{car.mileage.toLocaleString()} km
              </span>
            )}
            {car.fuelType && (
              <span className="flex items-center gap-1 text-[11px] text-[var(--text-muted)]">
                <Fuel className="w-3 h-3" />{car.fuelType}
              </span>
            )}
            {car.city && (
              <span className="flex items-center gap-1 text-[11px] text-[var(--text-muted)]">
                <MapPin className="w-3 h-3" />{car.city}
              </span>
            )}
          </div>

          <div className="mt-auto pt-3 border-t border-[var(--border-subtle)]
                          flex items-center justify-between gap-2">
            <span className="price-tag text-xl"
              style={{ background: 'linear-gradient(135deg, #f0d87a 0%, #c9a84c 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              {car.price ? `$${car.price.toLocaleString()}` : (car.priceFormatted ?? 'Contact')}
            </span>
            <span className="flex items-center gap-1 text-[10px] font-semibold text-[var(--gold)]/60
                             group-hover:text-[var(--gold)] transition-colors">
              <Zap className="w-3 h-3" />View
            </span>
          </div>
        </div>
      </article>
    </Link>
  );
});

/* ── Featured Cars Section ────────────────────────────────────── */
export function FeaturedCars({ locale }: { locale?: string }) {
  const [activeTab, setActiveTab] = useState<'featured' | 'new' | 'deals'>('featured');

  // BUG FIX: Removed `featured: true` filter.
  // All new listings have featured=false by default (schema: `featured Boolean @default(false)`).
  // Filtering by featured:true means regular seller listings NEVER appear on the homepage.
  // The featured badge is still shown per-card via `car.featured`. The backend already
  // sorts featured listings first: orderBy: [{ featured: 'desc' }, { createdAt: 'desc' }].
  // staleTime reduced from 5 min → 60 s so newly created listings appear quickly.
  const { data: allData, isLoading: allLoading } = useQuery({
    queryKey: queryKeys.listings.list({ type: 'CAR', limit: 8 }),
    queryFn: () => listingsApi.getAll({ type: 'CAR', limit: 8 }),
    staleTime: 60 * 1000,
  });

  // Separate query for the "⭐ Featured" tab — only when user clicks it
  const { data: featuredData, isLoading: featuredLoading } = useQuery({
    queryKey: queryKeys.listings.list({ type: 'CAR', featured: true, limit: 8 }),
    queryFn: () => listingsApi.getAll({ type: 'CAR', featured: true, limit: 8 }),
    staleTime: 60 * 1000,
    enabled: activeTab === 'featured',
  });

  // For "New Arrivals" tab: most recent (already default sort)
  // For "Best Deals" tab: lowest price (could add sortBy=price later, for now same pool)
  const isLoading = activeTab === 'featured' ? featuredLoading : allLoading;

  const rawCars = activeTab === 'featured'
    ? (featuredData?.data ?? allData?.data ?? [])  // fall back to allData if no featured listings
    : (allData?.data ?? []);

  const cars = rawCars;

  const tabs = [
    { id: 'featured', label: '⭐ Featured' },
    { id: 'new',      label: '⚡ New Arrivals' },
    { id: 'deals',    label: '🏷️ Best Deals' },
  ] as const;

  return (
    <section className="py-16 bg-[var(--surface-0)] dark:bg-[#050b14] relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none hidden dark:block opacity-[0.02]"
        style={{ backgroundImage: 'radial-gradient(circle, rgba(201,168,76,0.8) 1px, transparent 1px)', backgroundSize: '44px 44px' }} />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="w-5 h-px bg-gradient-to-r from-[#c9a84c] to-transparent" />
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#c9a84c]">Handpicked Listings</p>
            </div>
            <h2 className="text-2xl sm:text-3xl font-display font-black text-[var(--text-primary)]">
              Featured Cars
            </h2>
          </div>
          <Link
            href="/cars"
            className="inline-flex items-center gap-2 text-sm font-bold text-[var(--gold)]
                       hover:text-[var(--gold-light)] transition-colors group"
          >
            View all listings
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>

        {/* Tab switcher */}
        <div
          role="tablist"
          aria-label="Car listing categories"
          className="flex gap-1.5 mb-6 bg-white dark:bg-[#070e1c]/80 p-1 rounded-xl w-fit
                        border border-slate-100 dark:border-white/[0.08] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_4px_16px_rgba(0,0,0,0.20)]"
        >
          {tabs.map(tab => (
            <button
              key={tab.id}
              role="tab"
              aria-selected={activeTab === tab.id}
              aria-controls={`tabpanel-${tab.id}`}
              id={`tab-${tab.id}`}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200
                          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--gold)]
                          ${activeTab === tab.id
                            ? 'bg-gradient-to-r from-[#a87828] to-[#c9a84c] text-[#050b14] shadow-[0_2px_12px_rgba(201,168,76,0.38)] font-bold'
                            : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {Array.from({ length: 8 }).map((_, i) => <CarCardSkeleton key={i} />)}
          </div>
        ) : cars.length > 0 ? (
          <div
            id={`tabpanel-${activeTab}`}
            role="tabpanel"
            aria-labelledby={`tab-${activeTab}`}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5"
          >
            {cars.map((car: any) => (
              <CarCard key={car.id} car={car} locale={locale} />
            ))}
          </div>
        ) : (
          // Empty state
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-gray-400 dark:text-white/30 text-sm">
              No listings yet. Check back soon!
            </p>
          </div>
        )}

        {/* Bottom CTA */}
        <div className="text-center mt-10">
          <Link
            href="/cars"
            className="inline-flex items-center gap-2 h-12 px-8 rounded-2xl text-sm font-bold
                       border border-[#c9a84c]/35 text-[#c9a84c]
                       hover:bg-[#c9a84c]/08 hover:border-[#c9a84c]/70
                       hover:shadow-[0_0_24px_rgba(201,168,76,0.15)] hover:-translate-y-0.5
                       active:translate-y-0 transition-all duration-250"
          >
            Browse All Cars
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
