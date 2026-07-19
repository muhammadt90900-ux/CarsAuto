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
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
      {TILES.map(({ id, icon, labelKu, labelEn, color, statKey }) => {
        const count = statKey ? formatCount(stats?.[statKey]) : null;
        return (
          <Link key={id}
            href={`/${id === 'parts' ? 'spare-parts' : 'cars'}?category=${id}`}
            className="group relative rounded-2xl overflow-hidden cursor-pointer border border-white/[0.07] hover:border-[rgba(201,168,76,0.4)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_20px_60px_rgba(0,0,0,0.4)]"
            style={{ background: 'linear-gradient(145deg, rgba(11,21,37,0.9), rgba(8,15,28,0.95))' }}>
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                 style={{ background: `radial-gradient(circle at 50% 0%, ${color}18 0%, transparent 70%)` }} />
            <div className="relative p-5 text-center">
              <div className="text-4xl mb-3 transition-all duration-400 group-hover:scale-125 group-hover:-rotate-6 group-hover:drop-shadow-lg">{icon}</div>
              <div className="font-bold text-white text-sm mb-0.5">{labelKu}</div>
              <div className="text-white/40 text-[10px]">{labelEn}</div>
              {count && (
                <div className="mt-3 text-[10px] font-bold px-2 py-0.5 rounded-full inline-block"
                     style={{ color, background: `${color}15`, border: `1px solid ${color}35`, boxShadow: `0 2px 8px ${color}15` }}>{count}</div>
              )}
            </div>
          </Link>
        );
      })}
    </div>
  );
}
