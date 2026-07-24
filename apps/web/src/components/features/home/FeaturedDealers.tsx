'use client';
// components/features/home/FeaturedDealers.tsx — PERFORMANCE OPTIMISED
// Key improvements:
//   1. useQuery instead of useEffect+fetch — participates in TanStack cache
//   2. React.memo on DealerCard — prevents parent re-renders
//   3. Skeleton shown while loading
//   4. Image: fill+sizes on cover, fixed size on logo for better LCP

import { memo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRef } from 'react';
import { MapPin, Star, ChevronRight, CheckCircle2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

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
  PLATINUM: 'var(--gold)',
  GOLD:     '#f59e0b',
  STANDARD: '#3b82f6',
  BASIC:    'var(--surface-0)33',
};

// PERF: memoised card — only re-renders when dealer prop changes identity
const DealerCard = memo(function DealerCard({
  dealer,
  locale,
}: {
  dealer: FeaturedDealer;
  locale: string;
}) {
  const name   = locale === 'ku' ? dealer.nameKu : dealer.nameEn;
  const accent = TIER_ACCENT[dealer.tier] ?? TIER_ACCENT.BASIC;

  return (
    <Link
      href={`/dealers/${dealer.slug}`}
      className="group flex-shrink-0 w-64 snap-start rounded-2xl overflow-hidden
                 bg-ink-700 border border-white/[0.07]
                 hover:border-[rgba(201,168,76,0.32)] transition-all duration-350
                 hover:-translate-y-1.5 hover:shadow-[0_20px_48px_rgba(0,0,0,0.60),0_0_0_1px_rgba(201,168,76,0.05)] relative"
      style={{ '--accent': accent } as React.CSSProperties}
      prefetch={false}
    >
      <div aria-hidden="true"
        className="absolute top-0 inset-x-0 h-[1.5px] opacity-0 group-hover:opacity-100 transition-opacity duration-400 z-10 pointer-events-none"
        style={{ background: 'linear-gradient(90deg, transparent, rgba(201,168,76,0.50), transparent)' }} />

      {/* Cover strip */}
      <div className="relative h-24 bg-gradient-to-br from-[#0b1a2e] to-[#162840] overflow-hidden">
        {dealer.coverUrl ? (
          // PERF: fill + sizes so browser picks the right srcset bucket
          <Image
            src={dealer.coverUrl}
            alt=""
            fill
            sizes="256px"
            className="object-cover opacity-50 group-hover:opacity-70 transition-opacity duration-500"
          />
        ) : (
          <div
            className="absolute inset-0"
            style={{ background: `radial-gradient(ellipse at 60% 30%, ${accent}20, transparent 65%)` }}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-ink-700 to-transparent" />

        {/* Logo */}
        <div className="absolute -bottom-4 start-3 w-10 h-10 rounded-xl border-2
                        border-ink-700 overflow-hidden bg-ink-700
                        flex items-center justify-center shadow-lg">
          {dealer.logoUrl ? (
            // PERF: fixed 40×40 — no layout shift, correct cache bucket
            <Image src={dealer.logoUrl} alt={name} width={40} height={40} className="object-contain" />
          ) : (
            <span className="text-base font-black" style={{ color: accent }}>
              {name.charAt(0)}
            </span>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="pt-7 px-3 pb-3 space-y-2">
        <div className="flex items-start gap-1">
          <div className="flex-1 min-w-0">
            <p className="font-display font-bold text-white text-sm leading-snug line-clamp-1
                          group-hover:text-[var(--gold-light)] transition-colors">
              {name}
            </p>
            {dealer.taglineEn && (
              <p className="text-[0.65rem] text-white/35 line-clamp-1 mt-0.5">
                {dealer.taglineEn}
              </p>
            )}
          </div>
          <CheckCircle2 className="w-3.5 h-3.5 text-[var(--gold)] flex-shrink-0 mt-0.5" />
        </div>

        {dealer.location && (
          <div className="flex items-center gap-1 text-[0.65rem] text-white/35">
            <MapPin className="w-2.5 h-2.5 text-[rgba(201,168,76,0.5)]" />
            {dealer.location.city}
          </div>
        )}

        <div className="flex items-center justify-between pt-1 border-t border-white/[0.05]">
          <div className="flex items-center gap-1">
            <Star className="w-3 h-3 text-[var(--gold)] fill-[var(--gold)]" />
            <span className="text-xs font-bold text-[var(--gold-light)]">
              {dealer.averageRating.toFixed(1)}
            </span>
            <span className="text-[0.65rem] text-white/25">({dealer.totalReviews})</span>
          </div>
          <span className="text-[0.65rem] text-white/35">{dealer.activeListings} listings</span>
        </div>
      </div>
    </Link>
  );
});

// PERF: skeleton while loading
function DealerCardSkeleton() {
  return (
    <div className="flex-shrink-0 w-64 snap-start rounded-2xl overflow-hidden
                    bg-ink-700 border border-white/[0.07]" aria-hidden>
      <div className="h-24 skeleton" />
      <div className="pt-7 px-3 pb-3 space-y-2">
        <div className="h-4 skeleton rounded w-3/4" />
        <div className="h-3 skeleton rounded w-1/2" />
        <div className="h-3 skeleton rounded w-2/3 mt-2" />
      </div>
    </div>
  );
}

export function FeaturedDealers({ locale = 'en' }: { locale?: string }) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // PERF: useQuery — participates in global cache (staleTime from queryClient defaults)
  const { data: dealers = [], isLoading } = useQuery<FeaturedDealer[]>({
    queryKey: ['dealers', 'featured'],
    queryFn: async () => {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/dealers?sortBy=rating&limit=8&tier=GOLD,PLATINUM`,
        { next: { revalidate: 120 } },
      );
      if (!res.ok) return [];
      const data = await res.json();
      return data.dealers ?? [];
    },
    staleTime: 2 * 60_000,  // 2 min — dealers don't change per-second
  });

  if (!isLoading && dealers.length === 0) return null;

  return (
    <section className="py-14 px-4 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none opacity-[0.018]"
        style={{ backgroundImage: 'radial-gradient(circle, rgba(201,168,76,0.7) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
      <div className="max-w-7xl mx-auto">

        {/* Section header */}
        <div className="flex items-end justify-between mb-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-[0.16em] bg-[var(--gold-subtle)] border border-[var(--gold-glow)] text-[var(--gold)] mb-3">
              ● Verified Dealers
            </div>
            <h2 className="font-display font-black text-white text-2xl">
              Top <span style={{ background: 'linear-gradient(135deg, var(--gold-light), var(--gold))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Dealerships</span>
            </h2>
          </div>
          <Link
            href="/dealers"
            className="flex items-center gap-1.5 text-sm font-semibold text-white/40 hover:text-[var(--gold)] transition-colors duration-200 px-3 py-1.5 rounded-lg hover:bg-[rgba(201,168,76,0.06)] border border-transparent hover:border-[rgba(201,168,76,0.2)]"
          >
            View all <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="relative">
          <div className="absolute start-0 top-0 bottom-3 w-8 z-10 pointer-events-none bg-gradient-to-r from-[var(--ink-900)] to-transparent hidden lg:block" />
          <div className="absolute end-0 top-0 bottom-3 w-16 z-10 pointer-events-none bg-gradient-to-l from-[var(--ink-900)] to-transparent" />
          <div
            ref={scrollRef}
            className="flex gap-4 overflow-x-auto pb-3 scrollbar-hide snap-x snap-mandatory"
          >
            {isLoading
              ? Array.from({ length: 4 }).map((_, i) => <DealerCardSkeleton key={i} />)
              : dealers.map(dealer => (
                  <DealerCard key={dealer.id} dealer={dealer} locale={locale} />
                ))
            }
          </div>
        </div>
      </div>
    </section>
  );
}
