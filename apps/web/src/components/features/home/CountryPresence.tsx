'use client';
// components/features/home/CountryPresence.tsx
//
// Previously this row showed "Iraq & Kurdistan 18,000+", "UAE 4,500+",
// "China 1,800+" — all hardcoded, and none of them real. The product is
// Iraq-only for now (confirmed by the team), so showing fake live listing
// counts for UAE and China was actively misleading. Iraq now shows the
// real active-listings count (GET /public/stats — accurate today since
// the whole platform is Iraq-based); UAE/China show a "Coming Soon" badge
// instead of inventing a number for markets that aren't live yet.

import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { publicApi } from '@/lib/api';
import { queryKeys } from '@/lib/queryKeys';

function formatCount(n: number | undefined): string {
  if (n == null) return '—';
  if (n >= 1000) return `${(n / 1000).toFixed(n >= 10_000 ? 0 : 1)}k+`;
  return String(n);
}

export function CountryPresence() {
  const t = useTranslations('home');
  const { data: stats, isLoading } = useQuery({
    queryKey: queryKeys.public.stats(),
    queryFn: () => publicApi.getStats(),
    staleTime: 5 * 60_000,
  });

  const countries = [
    { flag: '🇮🇶', name: t('countryIraq'), detail: t('countryIraqDetail'), live: true },
    { flag: '🇦🇪', name: t('countryUAE'),  detail: t('countryUAEDetail'), live: false },
    { flag: '🇨🇳', name: t('countryChina'), detail: t('countryChinaDetail'), live: false },
  ];

  return (
    <div className="border-b border-white/[0.04]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
        <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-5">
          <span className="text-[10px] uppercase tracking-[0.18em] text-white/20 font-black hidden sm:block">
            {t('servingLabel')}
          </span>
          {countries.map(({ flag, name, detail, live }) => (
            <div key={name}
              className="flex items-center gap-3 px-4 py-2.5 rounded-xl
                         border border-white/[0.06] bg-white/[0.02]
                         hover:border-[rgba(201,168,76,0.2)] hover:bg-[rgba(201,168,76,0.03)]
                         transition-all duration-200 cursor-default">
              <span className="text-2xl">{flag}</span>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-white/70">{name}</span>
                  {live ? (
                    <span className="text-[10px] font-black text-[var(--gold)] bg-[var(--gold-subtle)] px-1.5 py-0.5 rounded-full">
                      {isLoading ? '—' : formatCount(stats?.activeListings)}
                    </span>
                  ) : (
                    <span className="text-[10px] font-black text-white/40 bg-white/[0.05] px-1.5 py-0.5 rounded-full">
                      {t('comingSoon')}
                    </span>
                  )}
                </div>
                <div className="text-[9px] text-white/25 mt-0.5 hidden sm:block">{detail}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
