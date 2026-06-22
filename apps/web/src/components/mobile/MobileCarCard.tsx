'use client';
// components/mobile/MobileCarCard.tsx
// Touch-optimized car card with swipe-to-save, press feedback, image carousel

import { useState, useRef } from 'react';
import Link from 'next/link';
import { Heart, MapPin, Gauge, Fuel, Star, Share2, Zap } from 'lucide-react';
import { cn } from '@cars-auto/utils';
import { useLongPress, useSwipe } from '@/hooks/useMobileGestures';

const haptic = (ms = 15) => {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) navigator.vibrate(ms);
};

/* ── Swipe-to-save indicator ──────────────────────────────────── */
function SaveIndicator({ visible }: { visible: boolean }) {
  return (
    <div className={cn(
      'absolute inset-y-0 right-0 w-24 flex items-center justify-center',
      'bg-gradient-to-l from-[#e94560] to-transparent rounded-r-2xl z-10',
      'transition-opacity duration-200',
      visible ? 'opacity-100' : 'opacity-0'
    )}>
      <div className="flex flex-col items-center gap-1">
        <Heart className="w-6 h-6 fill-white stroke-white" />
        <span className="text-[9px] font-bold text-white uppercase tracking-wider">Save</span>
      </div>
    </div>
  );
}

/* ── Main card ────────────────────────────────────────────────── */
interface MobileCarCardProps {
  car: {
    id: string; title: string; price: string; year?: number;
    city?: string; mileage?: string; fuel?: string;
    images?: string[]; featured?: boolean; condition?: 'new' | 'used';
    rating?: number;
  };
  locale: string;
  onSave?: (id: string) => void;
  className?: string;
}

export function MobileCarCard({ car, locale, onSave, className }: MobileCarCardProps) {
  const [saved, setSaved] = useState(false);
  const [imgIdx, setImgIdx] = useState(0);
  const [cardDx, setCardDx] = useState(0);
  const [pressing, setPressing] = useState(false);
  const [showSwipe, setShowSwipe] = useState(false);
  const startX = useRef(0);
  const dragging = useRef(false);

  const images = car.images?.length ? car.images : ['/placeholder.jpg'];
  const threshold = 80;

  /* Long press → context menu */
  const longPressProps = useLongPress(() => {
    haptic(25);
    /* Could open context menu: share, save, etc. */
  });

  /* Swipe left → save, swipe right → nothing (use for nav) */
  const onTouchStart = (e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
    dragging.current = true;
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (!dragging.current) return;
    const dx = startX.current - e.touches[0].clientX;
    if (dx > 0) {
      setCardDx(Math.min(dx, threshold * 1.2));
      setShowSwipe(dx > threshold * 0.5);
    } else {
      setCardDx(0);
      setShowSwipe(false);
    }
  };

  const onTouchEnd = () => {
    dragging.current = false;
    if (cardDx >= threshold) {
      setSaved(v => !v);
      onSave?.(car.id);
      haptic(30);
    }
    setCardDx(0);
    setShowSwipe(false);
  };

  /* Image swipe */
  const swipe = useSwipe(
    () => setImgIdx(v => (v + 1) % images.length),
    () => setImgIdx(v => (v - 1 + images.length) % images.length)
  );

  return (
    <div
      className={cn('relative overflow-hidden', className)}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      <SaveIndicator visible={showSwipe} />

      <Link href="/cars/${car.id}">
        <article
          className={cn(
            'relative card-interactive',
            'rounded-2xl overflow-hidden',
            'bg-[#0b1525] border border-white/[0.06]',
            pressing && 'scale-[0.98]'
          )}
          style={{
            transform: `translateX(-${cardDx}px)`,
            transition: cardDx === 0 ? 'transform 0.3s cubic-bezier(0.32,0.72,0,1)' : 'none',
          }}
          onPointerDown={() => { setPressing(true); longPressProps.onPointerDown(); }}
          onPointerUp={() => { setPressing(false); longPressProps.onPointerUp(); }}
          onPointerLeave={() => { setPressing(false); longPressProps.onPointerLeave(); }}
        >
          {/* Image */}
          <div
            className="relative h-48 overflow-hidden bg-[#060f1a]"
            {...swipe}
          >
            <img
              src={images[imgIdx]}
              alt={car.title}
              className={cn(
                'w-full h-full object-cover',
                'transition-transform duration-500 ease-out',
                pressing && 'scale-[1.03]'
              )}
              onError={(e) => { (e.target as HTMLImageElement).src = '/placeholder.jpg'; }}
              draggable={false}
            />

            {/* Gradient */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

            {/* Image dots */}
            {images.length > 1 && (
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
                {images.map((_, i) => (
                  <div key={i} className={cn(
                    'h-1 rounded-full transition-all duration-200',
                    i === imgIdx ? 'w-4 bg-white' : 'w-1 bg-white/40'
                  )} />
                ))}
              </div>
            )}

            {/* Badges */}
            <div className="absolute top-2.5 left-2.5 flex gap-1.5">
              {car.featured && (
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full
                                  bg-[#c9a84c] text-[#1a0e00] text-[9px] font-bold uppercase tracking-wide">
                  <Star className="w-2.5 h-2.5 fill-current" />
                  Featured
                </span>
              )}
              {car.condition === 'new' && (
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full
                                  bg-emerald-500 text-white text-[9px] font-bold uppercase tracking-wide">
                  <Zap className="w-2.5 h-2.5" />
                  New
                </span>
              )}
            </div>

            {/* Save button */}
            <button
              className="absolute top-2.5 right-2.5 w-9 h-9 rounded-xl
                          flex items-center justify-center
                          bg-black/40 backdrop-blur-sm
                          active:scale-90 transition-transform duration-100"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setSaved(v => !v);
                onSave?.(car.id);
                haptic(saved ? 10 : 25);
              }}
              aria-label={saved ? 'Remove from saved' : 'Save listing'}
            >
              <Heart className={cn(
                'w-4 h-4 transition-all duration-200',
                saved ? 'fill-[#e94560] stroke-[#e94560]' : 'stroke-white/80'
              )} />
            </button>
          </div>

          {/* Content */}
          <div className="p-3.5 space-y-2">
            <div>
              <h3 className="text-[0.9rem] font-semibold text-white leading-snug line-clamp-1">
                {car.title}
              </h3>
              {car.year && (
                <p className="text-[0.75rem] text-white/40 mt-0.5">{car.year}</p>
              )}
            </div>

            {/* Specs row */}
            <div className="flex items-center gap-3 text-[0.72rem] text-white/40">
              {car.city && (
                <span className="flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-[#c9a84c]/60" />
                  {car.city}
                </span>
              )}
              {car.mileage && (
                <span className="flex items-center gap-1">
                  <Gauge className="w-3 h-3" />
                  {car.mileage}
                </span>
              )}
              {car.fuel && (
                <span className="flex items-center gap-1">
                  <Fuel className="w-3 h-3" />
                  {car.fuel}
                </span>
              )}
            </div>

            {/* Price row */}
            <div className="flex items-center justify-between pt-1
                             border-t border-white/[0.05]">
              <p className="text-[1.05rem] font-display font-extrabold text-[#c9a84c]">
                {car.price}
              </p>
              <button
                className="w-8 h-8 rounded-xl flex items-center justify-center
                            text-white/30 hover:text-white/60 hover:bg-white/[0.06]
                            transition-all active:scale-90"
                onClick={(e) => {
                  e.preventDefault();
                  if (navigator.share) {
                    navigator.share({ title: car.title, url: `/${locale}/cars/${car.id}` });
                  }
                }}
                aria-label="Share"
              >
                <Share2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </article>
      </Link>
    </div>
  );
}
