'use client';
// apps/web/src/components/features/home/FeaturedCars.tsx

import { useEffect, useState } from 'react';
import { Card, Skeleton } from '@auto-bazaar-pro/ui/components';
import { api } from '@/lib/api';
import Link from 'next/link';
import { MapPin, Gauge, Fuel, Star, Heart, ArrowLeft, ArrowRight } from 'lucide-react';

function CarCardSkeleton() {
  return (
    <div className="rounded-2xl overflow-hidden border border-white/[0.07] bg-white/[0.03] animate-pulse">
      <div className="h-48 bg-white/[0.06]" />
      <div className="p-4 space-y-3">
        <div className="h-4 bg-white/[0.06] rounded-lg w-3/4" />
        <div className="h-3 bg-white/[0.04] rounded-lg w-1/2" />
        <div className="flex gap-2 mt-2">
          <div className="h-3 bg-white/[0.04] rounded-full w-1/3" />
          <div className="h-3 bg-white/[0.04] rounded-full w-1/3" />
        </div>
        <div className="h-5 bg-white/[0.06] rounded-lg w-2/5 mt-3" />
      </div>
    </div>
  );
}

function CarCard({ car }: { car: any }) {
  const [liked, setLiked] = useState(false);
  const [imgError, setImgError] = useState(false);

  return (
    <Link href={`/cars/${car.id}`} className="block group">
      <div className="rounded-2xl overflow-hidden border border-white/[0.08] bg-[#0a1525] hover:border-[#c8a84b]/40 transition-all duration-300 hover:shadow-xl hover:shadow-[#c8a84b]/10 hover:-translate-y-1">
        {/* Image */}
        <div className="relative h-48 overflow-hidden bg-[#060f1a]">
          {!imgError ? (
            <img
              src={car.images?.[0] || '/placeholder.jpg'}
              alt={car.title}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              onError={() => setImgError(true)}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <div className="text-white/10 text-5xl">🚗</div>
            </div>
          )}

          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#0a1525]/80 via-transparent to-transparent" />

          {/* Badges */}
          <div className="absolute top-3 right-3 flex flex-col gap-1.5">
            {car.featured && (
              <span className="bg-[#c8a84b] text-[#050e18] text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                <Star className="w-2.5 h-2.5 fill-current" />
                تایبەت
              </span>
            )}
            {car.condition === 'new' && (
              <span className="bg-emerald-500/90 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">نوێ</span>
            )}
          </div>

          {/* Heart button */}
          <button
            onClick={e => { e.preventDefault(); setLiked(!liked); }}
            className="absolute top-3 left-3 w-8 h-8 rounded-full bg-black/40 backdrop-blur flex items-center justify-center hover:bg-black/60 transition-colors"
          >
            <Heart className={`w-4 h-4 transition-colors ${liked ? 'fill-red-500 text-red-500' : 'text-white/70'}`} />
          </button>

          {/* Year badge */}
          {car.year && (
            <div className="absolute bottom-3 left-3 bg-black/60 backdrop-blur text-white/90 text-xs font-bold px-2 py-0.5 rounded-lg">
              {car.year}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-4" dir="rtl">
          <h3 className="font-bold text-white text-sm leading-snug mb-1 truncate group-hover:text-[#c8a84b] transition-colors">
            {car.title || 'ئۆتۆمبێل'}
          </h3>

          {/* Location */}
          {car.city && (
            <div className="flex items-center gap-1 text-white/40 text-xs mb-3">
              <MapPin className="w-3 h-3" />
              <span>{car.city}</span>
            </div>
          )}

          {/* Specs row */}
          <div className="flex items-center gap-3 mb-3">
            {car.mileage && (
              <div className="flex items-center gap-1 text-white/50 text-xs">
                <Gauge className="w-3 h-3" />
                <span>{(car.mileage / 1000).toFixed(0)}k km</span>
              </div>
            )}
            {car.fuelType && (
              <div className="flex items-center gap-1 text-white/50 text-xs">
                <Fuel className="w-3 h-3" />
                <span>{car.fuelType}</span>
              </div>
            )}
          </div>

          {/* Divider */}
          <div className="h-px bg-white/[0.06] mb-3" />

          {/* Price */}
          <div className="flex items-end justify-between">
            <div>
              <span
                className="text-lg font-black"
                style={{
                  background: 'linear-gradient(135deg, #c8a84b, #f5d98b)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                ${car.price?.toLocaleString() || '---'}
              </span>
              {car.negotiable && (
                <span className="block text-[10px] text-white/30">قابڵی گفتوگۆ</span>
              )}
            </div>
            <div className="w-7 h-7 rounded-full border border-[#c8a84b]/30 flex items-center justify-center group-hover:bg-[#c8a84b]/10 transition-colors">
              <ArrowLeft className="w-3.5 h-3.5 text-[#c8a84b]/60 group-hover:text-[#c8a84b] transition-colors" />
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}

export function FeaturedCars() {
  const [cars, setCars] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.listings.getAll({ type: 'car', limit: '8' })
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
      <div className="text-center py-16" dir="rtl">
        <div className="text-5xl mb-4 opacity-20">🚗</div>
        <p className="text-white/40 text-sm">هیچ ئۆتۆمبێلێک نەدۆزرایەوە</p>
        <p className="text-white/20 text-xs mt-1">No vehicles found at this time</p>
      </div>
    );
  }

  return (
    <div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {cars.slice(0, 4).map((car: any) => <CarCard key={car.id} car={car} />)}
      </div>
    </div>
  );
}
