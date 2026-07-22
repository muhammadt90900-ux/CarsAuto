'use client';
// components/features/home/TrendingBrandsGrid.tsx
//
// Previously each brand tile had a hardcoded listing count ("5,200+" etc.)
// with no data source. Now fetches real per-brand counts from
// GET /public/stats/brands, keyed by the brand's English name.

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { publicApi } from '@/lib/api';
import { queryKeys } from '@/lib/queryKeys';

const BRANDS = [
  { name: 'Toyota',   logoText: 'T',   color: '#eb0a1e' },
  { name: 'BMW',      logoText: 'BMW', color: '#1c69d3' },
  { name: 'Mercedes', logoText: '★',   color: '#c0c0c0' },
  { name: 'Lexus',    logoText: 'L',   color: '#1a1a2e' },
  { name: 'KIA',      logoText: 'K',   color: '#05141f' },
  { name: 'Hyundai',  logoText: 'H',   color: '#002c5f' },
  { name: 'BYD',      logoText: 'BYD', color: '#1db954' },
  { name: 'Nissan',   logoText: 'N',   color: '#c3002f' },
] as const;

function formatCount(n: number | undefined): string | null {
  if (!n) return null;
  if (n >= 1000) return `${(n / 1000).toFixed(n >= 10_000 ? 0 : 1)}k+`;
  return `${n}`;
}

export function TrendingBrandsGrid() {
  const { data: stats } = useQuery({
    queryKey: queryKeys.public.brandStats(),
    queryFn: () => publicApi.getBrandStats(),
    staleTime: 5 * 60_000,
  });

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-4">
      {BRANDS.map(({ name, logoText, color }) => {
        const count = formatCount(stats?.[name]);
        return (
          <Link key={name} href={`/cars?make=${name}`}
            className="group relative rounded-[var(--r-lg)] overflow-hidden cursor-pointer border border-white/[0.07] hover:border-[rgba(201,168,76,0.4)] shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-lg)] transition-all duration-expo ease-out-expo hover:-translate-y-1.5 hover:scale-[1.03]"
            style={{ background: 'linear-gradient(145deg, rgba(11,21,37,0.9), rgba(8,15,28,0.95))' }}>
            {/* Ambient glow bloom on hover, consistent with category tiles */}
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                 style={{ background: `radial-gradient(circle at 50% 0%, ${color}22 0%, transparent 70%)` }} />
            <div className="relative p-5 text-center">
              {/*
                Logo text is always near-white regardless of the brand's own
                color — several brand colors (Lexus #1a1a2e, KIA #05141f) are
                near-black and were unreadable as text-color-on-dark-card.
                The brand color now drives the ring/glow/background instead,
                which keeps each tile identifiable without sacrificing legibility.
              */}
              <div
                className="w-14 h-14 rounded-full mx-auto mb-3.5 flex items-center justify-center
                           text-white text-sm font-black border-2 transition-all duration-300 ease-out
                           group-hover:scale-110 group-hover:-rotate-3"
                style={{ background: `linear-gradient(145deg, ${color}55, ${color}30)`, borderColor: `${color}70`, boxShadow: `0 4px 16px ${color}30` }}
              >
                {logoText}
              </div>
              <div className="font-bold text-white text-xs mb-1 tracking-tight">{name}</div>
              {count && (
                <div className="text-white/35 text-[9px] font-semibold transition-colors duration-300 group-hover:text-white/55">
                  {count}
                </div>
              )}
            </div>
          </Link>
        );
      })}
    </div>
  );
}
