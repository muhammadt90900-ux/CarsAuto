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

  const imageUrl = car.images?.[0] || null;
  const href = locale ? `/${locale}/cars/${car.id}` : `/cars/${car.id}`;

  return (
    <Link href={href} className="block group" prefetch={false}>
      <article className="card-premium overflow-hidden h-full flex flex-col
                          rounded-2xl border border-slate-100 dark:border-white/[0.06]
                          bg-white dark:bg-[#0b1525]
                          shadow-[var(--shadow-md)]
                          hover:border-[#c9a84c]/30 dark:hover:border-[#c9a84c]/30
                          hover:shadow-[0_20px_60px_rgba(0,0,0,0.25)]
                          transition-all duration-300 hover:-translate-y-1.5">

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
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent
                          opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

          {/* Badges */}
          <div className="absolute top-3 left-3 flex gap-1.5">
            {car.featured && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black
                               bg-gradient-to-r from-[#c9a84c] to-[#e8cc7a] text-[#050b14]">
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
            <span className="price-tag text-xl">
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

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.listings.list({ type: 'CAR', featured: true }),
    queryFn: () => listingsApi.getAll({ type: 'CAR', featured: true, limit: 8 }),
    staleTime: 5 * 60 * 1000,
  });

  const cars = data?.data ?? [];

  const tabs = [
    { id: 'featured', label: '⭐ Featured' },
    { id: 'new',      label: '⚡ New Arrivals' },
    { id: 'deals',    label: '🏷️ Best Deals' },
  ] as const;

  return (
    <section className="py-16 bg-[var(--surface-0)] dark:bg-[#050b14]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#c9a84c] mb-2">
              Handpicked Listings
            </p>
            <h2 className="text-2xl sm:text-3xl font-display font-black text-[var(--text-primary)]">
              Featured Cars
            </h2>
          </div>
          <Link
            href={locale ? `/${locale}/cars` : '/cars'}
            className="inline-flex items-center gap-2 text-sm font-bold text-[var(--gold)]
                       hover:text-[var(--gold-light)] transition-colors group"
          >
            View all listings
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>

        {/* Tab switcher */}
        <div className="flex gap-2 mb-6 bg-white dark:bg-[#0b1525] p-1 rounded-xl w-fit
                        border border-slate-100 dark:border-white/[0.07]">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200
                          ${activeTab === tab.id
                            ? 'bg-[#c9a84c] text-[#050b14] shadow-sm'
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {cars.map((car: any) => (
              <CarCard key={car.id} car={car} locale={locale} />
            ))}
          </div>
        ) : (
          // Fallback mock grid when no API data
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              { id: '1', make: 'Toyota', model: 'Land Cruiser', year: 2023, price: 85000, mileage: 12000, city: 'Erbil', fuelType: 'Petrol', featured: true },
              { id: '2', make: 'BMW', model: '5 Series', year: 2022, price: 55000, mileage: 28000, city: 'Sulaymaniyah', fuelType: 'Petrol', verified: true },
              { id: '3', make: 'Lexus', model: 'LX570', year: 2021, price: 92000, mileage: 35000, city: 'Baghdad', fuelType: 'Petrol' },
              { id: '4', make: 'Toyota', model: 'Camry Hybrid', year: 2023, price: 28000, mileage: 5000, city: 'Dubai', fuelType: 'Hybrid', condition: 'New' },
              { id: '5', make: 'Kia', model: 'Sportage', year: 2022, price: 22000, mileage: 18000, city: 'Erbil', fuelType: 'Petrol' },
              { id: '6', make: 'Mercedes', model: 'GLE 450', year: 2022, price: 78000, mileage: 22000, city: 'Dubai', fuelType: 'Petrol', verified: true },
              { id: '7', make: 'Nissan', model: 'Patrol', year: 2023, price: 68000, mileage: 8000, city: 'Kirkuk', fuelType: 'Petrol', condition: 'New' },
              { id: '8', make: 'BYD', model: 'Atto 3', year: 2023, price: 35000, mileage: 4000, city: 'Erbil', fuelType: 'Electric', condition: 'New' },
            ].map(car => (
              <CarCard key={car.id} car={car} locale={locale} />
            ))}
          </div>
        )}

        {/* Bottom CTA */}
        <div className="text-center mt-10">
          <Link
            href={locale ? `/${locale}/cars` : '/cars'}
            className="inline-flex items-center gap-2 h-12 px-8 rounded-2xl text-sm font-bold
                       border-2 border-[#c9a84c]/40 text-[#c9a84c]
                       hover:bg-[#c9a84c]/10 hover:border-[#c9a84c]
                       transition-all duration-200"
          >
            Browse All 24,000+ Cars
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
