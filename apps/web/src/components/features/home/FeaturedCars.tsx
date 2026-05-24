'use client';
// components/features/home/FeaturedCars.tsx
// Redesigned — Premium automotive card design

import { useEffect, useState } from 'react';
import { listingsApi } from '../../../lib/api';
import Link from 'next/link';
import { MapPin, Gauge, Fuel, Star, Heart, ArrowLeft, ArrowRight, Zap } from 'lucide-react';

/* ── Skeleton ─────────────────────────────────────────────────── */
function CarCardSkeleton() {
  return (
    <div className="rounded-2xl overflow-hidden
                    bg-white dark:bg-[#0b1525]
                    border border-slate-100 dark:border-white/[0.06]
                    shadow-[var(--shadow-md)]">
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

/* ── Car Card ─────────────────────────────────────────────────── */
function CarCard({ car }: { car: any }) {
  const [liked,    setLiked]    = useState(false);
  const [imgError, setImgError] = useState(false);

  return (
    <Link ref={`/cars/${car.id}`} className="block group">
      <article className="card-premium overflow-hidden h-full flex flex-col">

        {/* Image area */}
        <div className="relative h-52 overflow-hidden bg-slate-100 dark:bg-[#060f1a] flex-shrink-0">
          {!imgError ? (
            <img
              src={car.images?.[0] || '/placeholder.jpg'}
              alt={car.title}
              className="w-full h-full object-cover
                         transition-transform duration-500 ease-out
                         group-hover:scale-[1.06]"
              onError={() => setImgError(true)}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <span className="text-slate-200 dark:text-white/10 text-6xl">🚗</span>
            </div>
          )}

          {/* Image overlay gradient */}
          <div className="absolute inset-0
                          bg-gradient-to-t from-black/50 via-transparent to-transparent
                          opacity-0 group-hover:opacity-100 transition-opacity duration-400" />

          {/* Badges top-right */}
          <div className="absolute top-3 end-3 flex flex-col gap-1.5 items-end">
            {car.featured && (
              <span className="badge-gold !text-[9px] !py-0.5 !px-2.5">
                <Star className="w-2.5 h-2.5 fill-current" />
                تایبەت
              </span>
            )}
            {car.condition === 'new' && (
              <span className="inline-flex items-center gap-1
                               bg-emerald-500 text-white text-[9px] font-bold
                               px-2.5 py-0.5 rounded-full">
                <Zap className="w-2.5 h-2.5" />
                نوێ / New
              </span>
            )}
          </div>

          {/* Heart button top-left */}
          <button
            onClick={e => { e.preventDefault(); setLiked(v => !v); }}
            aria-label={liked ? 'Remove from favorites' : 'Add to favorites'}
            className={`absolute top-3 start-3 w-8 h-8 rounded-full
                        flex items-center justify-center
                        backdrop-blur-md transition-all duration-200
                        ${liked
                          ? 'bg-red-500 text-white shadow-[0_0_12px_rgba(239,68,68,0.5)]'
                          : 'bg-black/35 text-white/65 hover:bg-black/55 hover:text-white'
                        }`}
          >
            <Heart className={`w-3.5 h-3.5 transition-all duration-200 ${liked ? 'fill-current scale-110' : ''}`} />
          </button>

          {/* Year chip bottom-left */}
          {car.year && (
            <div className="absolute bottom-3 start-3
                            bg-black/55 backdrop-blur-md
                            text-white/90 text-xs font-bold
                            px-2.5 py-1 rounded-lg tabular-nums">
              {car.year}
            </div>
          )}
        </div>

        {/* Card body */}
        <div className="p-4 flex flex-col flex-1" dir="rtl">
          <h3 className="font-semibold text-[var(--text-primary)] text-sm leading-snug mb-1
                         truncate group-hover:text-[#c9a84c] transition-colors duration-200">
            {car.title || 'ئۆتۆمبێل'}
          </h3>

          {car.city && (
            <div className="flex items-center gap-1 text-[var(--text-muted)] text-xs mb-3">
              <MapPin className="w-3 h-3 flex-shrink-0" />
              <span>{car.city}</span>
            </div>
          )}

          {/* Specs */}
          <div className="flex items-center gap-3 mb-4">
            {car.mileage && (
              <div className="flex items-center gap-1 text-[var(--text-faint)] text-xs">
                <Gauge className="w-3 h-3" />
                <span className="tabular-nums">{(car.mileage / 1000).toFixed(0)}k km</span>
              </div>
            )}
            {car.fuelType && (
              <div className="flex items-center gap-1 text-[var(--text-faint)] text-xs">
                <Fuel className="w-3 h-3" />
                <span>{car.fuelType}</span>
              </div>
            )}
          </div>

          {/* Divider */}
          <div classNalistingsApime="h-px bg-slate-100 dark:bg-white/[0.06] mb-3 mt-auto" />

          {/* Price row */}
          <div className="flex items-center justify-between">
            <div>
              <span className="text-lg font-extrabold text-gold tabular-nums font-display">
                ${car.price?.toLocaleString() || '---'}
              </span>
              {car.negotiable && (
                <span className="block text-[10px] text-[var(--text-faint)] mt-0.5">
                  قابڵی گفتوگۆ / Negotiable
                </span>
              )}
            </div>

            {/* Arrow CTA */}
            <div className="w-8 h-8 rounded-full
                            border border-[#c9a84c]/25
                            flex items-center justify-center
                            group-hover:bg-[#c9a84c] group-hover:border-[#c9a84c]
                            transition-all duration-250 shadow-none
                            group-hover:shadow-[var(--shadow-gold-sm)]">
              <ArrowLeft className="w-3.5 h-3.5 text-[#c9a84c]/60
                                    group-hover:text-[#050b14]
                                    transition-colors duration-200" />
            </div>
          </div>
        </div>
      </article>
    </Link>
  );
}

/* ── FeaturedCars section ─────────────────────────────────────── */
export function FeaturedCars() {
  const [cars,    setCars]    = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listingsApi.getAll({ type: 'car', limit: '8' })
      .then(res => setCars(res.data || res || []))
      .catch(() => setCars([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {Array.from({ length: 4 }).map((_, i) => <CarCardSkeleton key={i} />)}
      </div>
    );
  }

  if (cars.length === 0) {
    return (
      <div className="text-center py-20" dir="rtl">
        <div className="text-6xl mb-5 opacity-15">🚗</div>
        <p className="text-[var(--text-muted)] text-sm font-medium mb-1">
          هیچ ئۆتۆمبێلێک نەدۆزرایەوە
        </p>
        <p className="text-[var(--text-faint)] text-xs">No vehicles found at this time</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
      {cars.slice(0, 4).map((car: any) => <CarCard key={car.id} car={car} />)}
    </div>
  );
}
