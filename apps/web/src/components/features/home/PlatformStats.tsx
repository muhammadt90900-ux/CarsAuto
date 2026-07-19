'use client';
// components/features/home/PlatformStats.tsx
//
// Previously the homepage stats banner was a hardcoded `PLATFORM_STATS` array
// — "24,000+ Active Listings", "98% Satisfaction Rate", "50,000+ Happy
// Customers", etc. — shown to every visitor regardless of the real numbers.
// Two of those six figures (satisfaction rate, avg. time to sell, happy
// customers) have no backing data source anywhere in the API, so rather than
// inventing new fake numbers for them, this only shows the four stats that
// GET /public/stats actually reports (same endpoint the footer already uses).

import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { publicApi } from '@/lib/api';
import { queryKeys } from '@/lib/queryKeys';

function formatCount(n: number | undefined): string {
  if (n == null) return '—';
  if (n >= 1000) return `${(n / 1000).toFixed(n >= 10_000 ? 0 : 1)}k+`;
  return String(n);
}

export function PlatformStats() {
  const t = useTranslations('home');
  const { data: stats, isLoading } = useQuery({
    queryKey: queryKeys.public.stats(),
    queryFn: () => publicApi.getStats(),
    staleTime: 5 * 60_000,
  });

  const tiles = [
    { icon: '🚗', value: formatCount(stats?.activeListings), label: t('statsListings') },
    { icon: '🏪', value: formatCount(stats?.verifiedDealers), label: t('statsDealers') },
    { icon: '📍', value: stats?.cities != null ? String(stats.cities) : '—', label: t('statsCities') },
    { icon: '⭐', value: stats?.averageRating ? `${stats.averageRating}★` : '—', label: t('statsRating') },
  ];

  return (
    <div className="relative overflow-hidden border-y border-[rgba(201,168,76,0.15)] shadow-[inset_0_1px_0_rgba(201,168,76,0.06),inset_0_-1px_0_rgba(201,168,76,0.06)]"
         style={{ background: 'linear-gradient(90deg, var(--ink-900) 0%, var(--ink-800) 50%, var(--ink-900) 100%)' }}>
      <div className="absolute inset-0 opacity-[0.03]"
           style={{ backgroundImage: 'radial-gradient(circle, rgba(201,168,76,1) 1px, transparent 1px)', backgroundSize: '32px 32px' }} />
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
          {tiles.map(({ icon, value, label }, i) => (
            <div key={label} className="text-center stat-animate" style={{ animationDelay: `${i * 0.1}s` }}>
              <div className="text-2xl mb-1">{icon}</div>
              <div className="text-2xl sm:text-3xl font-black tabular-nums leading-none"
                style={{ background: 'linear-gradient(135deg, var(--gold-bright) 0%, var(--gold) 60%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                {isLoading ? '—' : value}
              </div>
              <div className="text-white/50 text-xs mt-1 leading-tight">{label}</div>
            </div>
          ))}
        </div>
      </div>
      <style>{`
        @keyframes statReveal { from { opacity:0; transform:translateY(16px) } to { opacity:1; transform:translateY(0) } }
        .stat-animate { animation: statReveal 0.6s cubic-bezier(0.16,1,0.3,1) both }
      `}</style>
    </div>
  );
}
