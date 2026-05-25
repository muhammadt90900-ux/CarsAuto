import { getTranslations } from 'next-intl/server';
import type { Metadata } from 'next';
import { HeroSearch }   from '@/components/features/home/HeroSearch';
import { FeaturedCars } from '@/components/features/home/FeaturedCars';
import { RecentParts }  from '@/components/features/home/RecentParts';
import Link from 'next/link';

type Props = { params: { locale: string } };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const t = await getTranslations({ locale: params.locale, namespace: 'meta' });
  return { title: t('homeTitle'), description: t('homeDesc') };
}

export default async function HomePage({ params }: Props) {
  const t  = await getTranslations({ locale: params.locale, namespace: 'home' });
  const tc = await getTranslations({ locale: params.locale, namespace: 'common' });
  const locale = params.locale;

  const trustItems = [
    { icon: '🔐', key: 'safeSecure',      subKey: 'safeSecureSub'      },
    { icon: '✅', key: 'verifiedDealers', subKey: 'verifiedDealersSub' },
    { icon: '💬', key: 'directChat',      subKey: 'directChatSub'      },
    { icon: '🌍', key: 'middleEastWide',  subKey: 'middleEastWideSub'  },
  ] as const;

  return (
    <>
      {/* ── Hero ───────────────────────────────────────────────── */}
      <HeroSearch />

      {/* ── Featured Cars ──────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-20">
        <div className="flex items-end justify-between mb-8 gap-4">
          <div>
            <p className="text-[#c9a84c] text-xs font-bold tracking-[0.14em] uppercase mb-2">
              {t('featuredEyebrow')}
            </p>
            <h2 className="section-heading text-2xl sm:text-3xl text-[var(--text-primary)]">
              {t('featuredCars')}
            </h2>
          </div>
          <Link
            href={`/${locale}/cars`}
            className="hidden sm:inline-flex items-center gap-2 text-sm font-semibold
                       text-[#c9a84c] hover:text-[#e8cc7a] transition-colors duration-200 whitespace-nowrap"
          >
            {t('viewAll')} <span aria-hidden>→</span>
          </Link>
        </div>
        <div className="h-px bg-gradient-to-r from-[#c9a84c]/30 via-[#c9a84c]/10 to-transparent mb-8" />
        <FeaturedCars />
      </section>

      {/* ── Trust strip ────────────────────────────────────────── */}
      <div className="border-y border-slate-100 dark:border-white/[0.06] bg-slate-50 dark:bg-[#080f1c] py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap justify-center sm:justify-between items-center gap-6">
            {trustItems.map(({ icon, key, subKey }) => (
              <div key={key} className="flex items-center gap-3">
                <span className="text-2xl flex-shrink-0" aria-hidden>{icon}</span>
                <div>
                  <p className="text-[var(--text-primary)] text-sm font-semibold leading-tight">{t(key)}</p>
                  <p className="text-[var(--text-faint)] text-xs">{t(subKey)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Spare Parts ────────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-20">
        <div className="flex items-end justify-between mb-8 gap-4">
          <div>
            <p className="text-[#c9a84c] text-xs font-bold tracking-[0.14em] uppercase mb-2">
              {t('partsEyebrow')}
            </p>
            <h2 className="section-heading text-2xl sm:text-3xl text-[var(--text-primary)]">
              {t('recentParts')}
            </h2>
          </div>
          <Link
            href={`/${locale}/spare-parts`}
            className="hidden sm:inline-flex items-center gap-2 text-sm font-semibold
                       text-[#c9a84c] hover:text-[#e8cc7a] transition-colors duration-200 whitespace-nowrap"
          >
            {t('viewAll')} <span aria-hidden>→</span>
          </Link>
        </div>
        <div className="h-px bg-gradient-to-r from-[#c9a84c]/30 via-[#c9a84c]/10 to-transparent mb-8" />
        <RecentParts />
      </section>

      {/* ── CTA Banner ─────────────────────────────────────────── */}
      <section className="mx-4 sm:mx-6 lg:mx-8 mb-16 rounded-2xl overflow-hidden relative"
               style={{ background: 'linear-gradient(135deg, #080f1c 0%, #0f1c2e 50%, #080f1c 100%)' }}>
        <div className="absolute inset-0 pointer-events-none opacity-[0.04]"
             style={{ backgroundImage: 'radial-gradient(circle,rgba(201,168,76,1) 1px,transparent 1px)', backgroundSize: '28px 28px' }}
             aria-hidden />
        <div className="relative px-8 py-12 sm:py-16 text-center space-y-4">
          <h2 className="text-2xl sm:text-3xl font-bold text-white">{t('sellCTATitle')}</h2>
          <p className="text-white/60 max-w-md mx-auto">{t('sellCTASubtitle')}</p>
          <div className="flex flex-wrap gap-3 justify-center pt-2">
            <Link
              href={`/${locale}/dashboard/listings/new`}
              className="px-6 py-3 rounded-xl text-sm font-semibold text-white transition-all duration-200
                         shadow-[0_4px_24px_rgba(201,168,76,0.3)] hover:shadow-[0_6px_32px_rgba(201,168,76,0.5)]
                         hover:-translate-y-0.5 active:translate-y-0"
              style={{ background: 'linear-gradient(135deg,#c9a84c,#9e6e1e)' }}
            >
              {t('sellCTAButton')}
            </Link>
            <Link
              href={`/${locale}/cars`}
              className="px-6 py-3 rounded-xl text-sm font-semibold text-white/70
                         border border-white/15 hover:border-white/30 hover:text-white
                         transition-all duration-200"
            >
              {t('browseAll')}
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
