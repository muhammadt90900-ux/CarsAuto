import { getTranslations } from 'next-intl/server';
import { HeroSearch } from '@/components/features/home/HeroSearch';
import { FeaturedCars } from '@/components/features/home/FeaturedCars';
import { RecentParts } from '@/components/features/home/RecentParts';

type Props = { params: { locale: string } };

export default async function HomePage({ params }: Props) {
  const t = await getTranslations({ locale: params.locale, namespace: 'home' });

  return (
    <>
      {/* ── Hero (full-bleed, connects seamlessly with Navbar above) ── */}
      <HeroSearch />

      {/* ── Featured Cars ─────────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-20">
        {/* Section header */}
        <div className="flex items-end justify-between mb-8 gap-4">
          <div>
            {/* Eyebrow */}
            <p className="text-[#c9a84c] text-xs font-bold tracking-[0.14em] uppercase mb-2">
              Featured / تایبەت
            </p>
            <h2 className="section-heading text-2xl sm:text-3xl text-[var(--text-primary)]">
              {t('featuredCars')}
            </h2>
          </div>
          <a
            href="#"
            className="hidden sm:inline-flex items-center gap-2 text-sm font-semibold
                       text-[#c9a84c] hover:text-[#e8cc7a] transition-colors duration-200
                       whitespace-nowrap"
          >
            بینینی هەموو
            <span aria-hidden>→</span>
          </a>
        </div>

        {/* Gold accent line under heading */}
        <div className="h-px bg-gradient-to-r from-[#c9a84c]/30 via-[#c9a84c]/10 to-transparent mb-8" />

        <FeaturedCars />
      </section>

      {/* ── Trust strip ───────────────────────────────────────────── */}
      <div className="border-y border-slate-100 dark:border-white/[0.06]
                      bg-slate-50 dark:bg-[#080f1c] py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap justify-center sm:justify-between
                          items-center gap-6 sm:gap-0">
            {[
              { icon: '🔐', text: 'Safe & Secure', subtext: 'تەندروستی و ئەمنی' },
              { icon: '✅', text: 'Verified Dealers',subtext: 'فرۆشەری دڵنیاکراو' },
              { icon: '💬', text: 'Direct Chat',    subtext: 'پەیوەندی ڕاستەوخۆ' },
              { icon: '🌍', text: 'Middle East Wide',subtext: 'ناوچەی ئینتەرنەتی' },
            ].map(({ icon, text, subtext }) => (
              <div key={text} className="flex items-center gap-3 text-center sm:text-start">
                <span className="text-2xl flex-shrink-0">{icon}</span>
                <div>
                  <p className="text-[var(--text-primary)] text-sm font-semibold leading-tight">{text}</p>
                  <p className="text-[var(--text-faint)] text-xs">{subtext}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Spare Parts ───────────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-20">
        <div className="flex items-end justify-between mb-8 gap-4">
          <div>
            <p className="text-[#c9a84c] text-xs font-bold tracking-[0.14em] uppercase mb-2">
              Spare Parts / پارچەسازی
            </p>
            <h2 className="section-heading text-2xl sm:text-3xl text-[var(--text-primary)]">
              {t('recentParts')}
            </h2>
          </div>
          <a
            href="#"
            className="hidden sm:inline-flex items-center gap-2 text-sm font-semibold
                       text-[#c9a84c] hover:text-[#e8cc7a] transition-colors duration-200
                       whitespace-nowrap"
          >
            بینینی هەموو
            <span aria-hidden>→</span>
          </a>
        </div>
        <div className="h-px bg-gradient-to-r from-[#c9a84c]/30 via-[#c9a84c]/10 to-transparent mb-8" />

        <RecentParts />
      </section>

      {/* ── CTA Banner ────────────────────────────────────────────── */}
      <section className="mx-4 sm:mx-6 lg:mx-8 mb-16 rounded-2xl overflow-hidden relative"
               style={{
                 background: 'linear-gradient(135deg, #080f1c 0%, #0f1c2e 50%, #080f1c 100%)',
               }}>
        {/* Gold accent */}
        <div className="absolute inset-x-0 top-0 h-[2px]
                        bg-gradient-to-r from-transparent via-[#c9a84c] to-transparent" />
        <div className="absolute inset-0 pointer-events-none"
             style={{
               background: 'radial-gradient(ellipse at 30% 50%, rgba(201,168,76,0.06) 0%, transparent 60%)',
             }} />

        <div className="relative z-10 max-w-3xl mx-auto text-center px-6 py-14 sm:py-16">
          <span className="badge-gold mb-5 inline-flex">
            <span className="pulse-dot" />
            فرۆشتن / Sell
          </span>
          <h2 className="section-heading text-2xl sm:text-3xl md:text-4xl text-white mb-4">
            ئۆتۆمبێلەکەت بفرۆشە
            <br />
            <span className="text-gold">بە نرخی باش</span>
          </h2>
          <p className="text-white/45 text-sm sm:text-base max-w-md mx-auto mb-8 leading-relaxed">
            Post your listing in minutes and reach thousands of verified buyers across Iraq, Kurdistan & Dubai.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <a href="#" className="btn-gold px-8 py-3 rounded-xl text-sm font-bold">
              دانانی ئاگادارکردنەوە
            </a>
            <a href="#" className="btn-ghost px-8 py-3 rounded-xl text-sm font-semibold">
              زیاتر بزانە
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
