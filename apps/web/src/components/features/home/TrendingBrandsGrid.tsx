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
    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
      {BRANDS.map(({ name, logoText, color }) => {
        const count = formatCount(stats?.[name]);
        return (
          <Link key={name} href={`/cars?make=${name}`}
            className="group relative rounded-xl overflow-hidden cursor-pointer border border-white/[0.07] hover:border-[rgba(201,168,76,0.4)] transition-all duration-300 hover:-translate-y-1"
            style={{ background: 'linear-gradient(145deg, rgba(11,21,37,0.9), rgba(8,15,28,0.95))' }}>
            <div className="relative p-4 text-center">
              <div className="w-12 h-12 rounded-full mx-auto mb-3 flex items-center justify-center text-white text-xs font-black border-2 transition-all duration-300 group-hover:scale-110"
                   style={{ background: `${color}18`, borderColor: `${color}45`, color, boxShadow: `0 4px 12px ${color}20` }}>
                {logoText}
              </div>
              <div className="font-bold text-white text-xs mb-1">{name}</div>
              {count && <div className="text-white/35 text-[9px]">{count}</div>}
            </div>
          </Link>
        );
      })}
    </div>
  );
}
