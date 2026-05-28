'use client';
// components/features/home/FeaturedDealers.tsx
// Homepage section: featured/premium dealers carousel

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import { MapPin, Star, ChevronRight, CheckCircle2 } from 'lucide-react';
import { cn } from '@auto-bazaar-pro/utils';

interface FeaturedDealer {
  id: string;
  slug: string;
  nameEn: string;
  nameKu: string;
  taglineEn?: string | null;
  logoUrl?: string | null;
  coverUrl?: string | null;
  tier: 'BASIC' | 'STANDARD' | 'GOLD' | 'PLATINUM';
  averageRating: number;
  totalReviews: number;
  activeListings: number;
  location?: { city: string } | null;
  badges?: Array<{ code: string; label: string }>;
}

const TIER_ACCENT: Record<string, string> = {
  PLATINUM: '#c9a84c',
  GOLD:     '#f59e0b',
  STANDARD: '#3b82f6',
  BASIC:    '#ffffff33',
};

async function getFeaturedDealers(): Promise<FeaturedDealer[]> {
  try {
    const res = await fetch('/api/dealers?sortBy=rating&limit=8&tier=GOLD,PLATINUM', { next: { revalidate: 120 } });
    if (!res.ok) return [];
    const data = await res.json();
    return data.dealers ?? [];
  } catch {
    return [];
  }
}

export function FeaturedDealers({ locale = 'en' }: { locale?: string }) {
  const [dealers, setDealers] = useState<FeaturedDealer[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getFeaturedDealers().then(setDealers);
  }, []);

  if (dealers.length === 0) return null;

  return (
    <section className="py-12 px-4">
      <div className="max-w-7xl mx-auto">

        {/* Section header */}
        <div className="flex items-end justify-between mb-6">
          <div>
            <div className="flex items-center gap-2 text-[#c9a84c] text-xs font-semibold uppercase tracking-widest mb-2">
              <span className="w-5 h-px bg-[#c9a84c]" />
              Verified Dealers
            </div>
            <h2 className="font-display font-black text-white text-2xl">Top Dealerships</h2>
          </div>
          <Link
            href={`/${locale}/dealers`}
            className="flex items-center gap-1 text-sm text-white/40 hover:text-[#c9a84c] transition-colors"
          >
            View all <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Scroll track */}
        <div
          ref={scrollRef}
          className="flex gap-4 overflow-x-auto pb-3 scrollbar-hide snap-x snap-mandatory"
        >
          {dealers.map(dealer => {
            const name   = locale === 'ku' ? dealer.nameKu : dealer.nameEn;
            const accent = TIER_ACCENT[dealer.tier] ?? TIER_ACCENT.BASIC;

            return (
              <Link
                key={dealer.id}
                href={`/${locale}/dealers/${dealer.slug}`}
                className="group flex-shrink-0 w-64 snap-start rounded-2xl overflow-hidden bg-[#0d1b2e] border border-white/[0.07] hover:border-[#c9a84c]/30 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_16px_40px_rgba(0,0,0,0.5)]"
                style={{ '--accent': accent } as React.CSSProperties}
              >
                {/* Cover strip */}
                <div className="relative h-24 bg-gradient-to-br from-[#0b1a2e] to-[#162840] overflow-hidden">
                  {dealer.coverUrl ? (
                    <Image
                      src={dealer.coverUrl} alt={name} fill
                      className="object-cover opacity-50 group-hover:opacity-70 transition-opacity duration-500"
                    />
                  ) : (
                    <div className="absolute inset-0" style={{ background: `radial-gradient(ellipse at 60% 40%, ${accent}15, transparent 70%)` }} />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0d1b2e] to-transparent" />

                  {/* Logo */}
                  <div className="absolute -bottom-4 left-3 w-10 h-10 rounded-xl border-2 border-[#0d1b2e] overflow-hidden bg-[#0d1b2e] flex items-center justify-center shadow-lg">
                    {dealer.logoUrl ? (
                      <Image src={dealer.logoUrl} alt={name} width={40} height={40} className="object-contain" />
                    ) : (
                      <span className="text-base font-black" style={{ color: accent }}>{name.charAt(0)}</span>
                    )}
                  </div>
                </div>

                {/* Body */}
                <div className="pt-7 px-3 pb-3 space-y-2">
                  <div className="flex items-start gap-1">
                    <div className="flex-1 min-w-0">
                      <p className="font-display font-bold text-white text-sm leading-snug line-clamp-1 group-hover:text-[#e8cc7a] transition-colors">
                        {name}
                      </p>
                      {dealer.taglineEn && (
                        <p className="text-[0.65rem] text-white/35 line-clamp-1 mt-0.5">{dealer.taglineEn}</p>
                      )}
                    </div>
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#c9a84c] flex-shrink-0 mt-0.5" />
                  </div>

                  {dealer.location && (
                    <div className="flex items-center gap-1 text-[0.65rem] text-white/35">
                      <MapPin className="w-2.5 h-2.5 text-[#c9a84c]/50" />
                      {dealer.location.city}
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-1 border-t border-white/[0.05]">
                    <div className="flex items-center gap-1">
                      <Star className="w-3 h-3 text-[#c9a84c] fill-[#c9a84c]" />
                      <span className="text-xs font-bold text-[#e8cc7a]">{dealer.averageRating.toFixed(1)}</span>
                      <span className="text-[0.65rem] text-white/25">({dealer.totalReviews})</span>
                    </div>
                    <span className="text-[0.65rem] text-white/35">{dealer.activeListings} listings</span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
