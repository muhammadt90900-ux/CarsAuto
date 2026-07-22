'use client';
// components/features/home/CategoryGrid.tsx
//
// Previously each category tile ("Sedan", "SUV", "Luxury", "Electric",
// "Pickup", "Parts") had a hardcoded count string ("4,200+", "6,800+"...)
// baked into the homepage with no real data behind it. This fetches real
// counts from GET /public/stats/categories. "Luxury" intentionally has no
// count pill — there's no queryable definition of "luxury" anywhere in the
// schema (no price-segment or brand-tier flag), so rather than invent one,
// it's shown without a number until the product defines what it means.

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { publicApi } from '@/lib/api';
import { queryKeys } from '@/lib/queryKeys';

const TILES = [
  { id: 'sedan',    icon: '🚗', labelKu: 'سیدان',       labelEn: 'Sedan',       color: '#3b82f6', statKey: 'sedan' as const },
  { id: 'suv',      icon: '🚙', labelKu: 'SUV',          labelEn: 'SUV / 4×4',   color: 'var(--gold)', statKey: 'suv' as const },
  { id: 'luxury',   icon: '💎', labelKu: 'لوکس',         labelEn: 'Luxury',      color: '#a855f7', statKey: null },
  { id: 'electric', icon: '⚡', labelKu: 'کارەبایی',     labelEn: 'Electric',    color: '#10b981', statKey: 'electric' as const },
  { id: 'pickup',   icon: '🛻', labelKu: 'پیکەپ',        labelEn: 'Pickup',      color: '#ef4444', statKey: 'pickup' as const },
  { id: 'parts',    icon: '⚙️', labelKu: 'پارچەکان',     labelEn: 'Parts',       color: '#f97316', statKey: 'parts' as const },
] as const;

function formatCount(n: number | undefined): string | null {
  if (n == null) return null;
  if (n >= 1000) return `${(n / 1000).toFixed(n >= 10_000 ? 0 : 1)}k+`;
  return String(n);
}

export function CategoryGrid() {
  const { data: stats } = useQuery({
    queryKey: queryKeys.public.categoryStats(),
    queryFn: () => publicApi.getCategoryStats(),
    staleTime: 5 * 60_000,
  });

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-5 sm:gap-6">
      {TILES.map(({ id, icon, labelKu, labelEn, color, statKey }) => {
        const count = statKey ? formatCount(stats?.[statKey]) : null;
        return (
          <Link key={id}
            href={`/${id === 'parts' ? 'spare-parts' : 'cars'}?category=${id}`}
            className="group relative rounded-[var(--r-xl)] overflow-hidden cursor-pointer border border-white/[0.07] hover:border-[rgba(201,168,76,0.4)] shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-xl)] transition-all duration-expo ease-out-expo hover:-translate-y-1.5 hover:scale-[1.02]"
            style={{ background: 'linear-gradient(145deg, rgba(11,21,37,0.9), rgba(8,15,28,0.95))' }}>
            {/* Ambient glow that blooms from the icon on hover */}
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                 style={{ background: `radial-gradient(circle at 50% 0%, ${color}20 0%, transparent 70%)` }} />
            {/* Corner sheen sweep */}
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                 style={{ background: `linear-gradient(135deg, transparent 40%, ${color}12 50%, transparent 60%)` }} />

            <div className="relative p-6 sm:p-7 text-center">
              {/* Icon sits in its own tinted chip so it reads clearly against the dark card */}
              <div
                className="mx-auto mb-4 w-16 h-16 sm:w-[4.5rem] sm:h-[4.5rem] rounded-2xl flex items-center justify-center
                           transition-all duration-400 ease-out
                           group-hover:scale-110 group-hover:-rotate-6"
                style={{ background: `${color}16`, border: `1px solid ${color}30`, boxShadow: `0 8px 24px ${color}12` }}
              >
                <span className="text-4xl sm:text-[2.75rem] leading-none drop-shadow-sm transition-transform duration-400 group-hover:scale-110">
                  {icon}
                </span>
              </div>

              <div className="font-black text-white text-base sm:text-[1.05rem] mb-1 tracking-tight">{labelKu}</div>
              <div className="text-white/35 text-[10px] font-semibold uppercase tracking-[0.1em]">{labelEn}</div>

              {count && (
                <div className="mt-3.5 text-[10px] font-bold px-2.5 py-1 rounded-full inline-block
                                 transition-transform duration-300 group-hover:scale-105"
                     style={{ color, background: `${color}15`, border: `1px solid ${color}35`, boxShadow: `0 2px 8px ${color}15` }}>{count}</div>
              )}
            </div>
          </Link>
        );
      })}
    </div>
  );
}
