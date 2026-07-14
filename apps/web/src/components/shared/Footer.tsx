// components/shared/Footer.tsx — newsletter CTA, app download, trust badges
// Fixed: broken link paths, missing i18n/RTL, dead legal/company links, fake social icons.

'use client';
import { Link } from '@/i18n/navigation';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { isRTL, type Locale } from '@/i18n/config';
import { publicApi, newsletterApi } from '@/lib/api';
import { queryKeys } from '@/lib/queryKeys';
import { ArrowRight, CheckCircle2, Shield, Star, Zap, Twitter, Facebook, Linkedin, Instagram, AlertCircle } from 'lucide-react';

// Every href below points to a route that actually exists in the app.
// Category/city links deep-link into the real /cars filters instead of
// fabricating dozens of pages that don't exist.
const FOOTER_LINKS: Record<string, { key: string; href: string }[]> = {
  browse: [
    { key: 'allCars',      href: '/cars' },
    { key: 'suvs4x4',      href: '/cars?bodyType=SUV' },
    { key: 'electric',     href: '/cars?fuelType=Electric' },
    { key: 'spareParts',   href: '/spare-parts' },
    { key: 'accessories',  href: '/accessories' },
    { key: 'carServices',  href: '/services' },
    { key: 'motorcycles',  href: '/motorcycles' },
    { key: 'newListings',  href: '/cars?sort=newest' },
  ],
  services: [
    { key: 'sellYourCar',   href: '/sell' },
    { key: 'becomeDealer',  href: '/dealers/register' },
    { key: 'dealerPortal',  href: '/dashboard/dealers' },
    { key: 'premiumListing', href: '/dashboard/subscription' },
  ],
  cities: [
    { key: 'erbil',         href: '/cars?city=Erbil' },
    { key: 'sulaymaniyah',  href: '/cars?city=Sulaymaniyah' },
    { key: 'duhok',         href: '/cars?city=Duhok' },
    { key: 'kirkuk',        href: '/cars?city=Kirkuk' },
    { key: 'baghdad',       href: '/cars?city=Baghdad' },
    { key: 'basra',         href: '/cars?city=Basra' },
    { key: 'dubai',         href: '/cars?city=Dubai' },
    { key: 'sharjah',       href: '/cars?city=Sharjah' },
  ],
  company: [
    { key: 'aboutUs',       href: '/about' },
    { key: 'contact',       href: '/contact' },
    { key: 'privacyPolicy', href: '/privacy-policy' },
    { key: 'termsOfUse',    href: '/terms-of-use' },
  ],
};

// Real, working CarsAuto social accounts. Swap these placeholders for the
// live handles when they exist — until then each entry is commented so it's
// obvious this list still needs real URLs, rather than pointing at generic
// platform homepages.
const SOCIAL_LINKS = [
  { Icon: Twitter,   href: 'https://twitter.com/carsauto',   label: 'Twitter / X' },
  { Icon: Facebook,  href: 'https://facebook.com/carsauto',  label: 'Facebook' },
  { Icon: Linkedin,  href: 'https://linkedin.com/company/carsauto', label: 'LinkedIn' },
  { Icon: Instagram, href: 'https://instagram.com/carsauto', label: 'Instagram' },
];

export function Footer({ locale = 'ku' }: { locale?: string }) {
  const t = useTranslations('footer');
  const rtl = isRTL(locale as Locale);

  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  // Previously hardcoded ("24k+", "1.2k+", "8", "4.9★") with no data
  // source — permanently-fake trust signals shown to every visitor
  // regardless of the real numbers. Now backed by GET /public/stats.
  const { data: stats } = useQuery({
    queryKey: queryKeys.public.stats(),
    queryFn: () => publicApi.getStats(),
    staleTime: 5 * 60_000,
  });

  const formatCount = (n: number | undefined) => {
    if (n == null) return '—';
    if (n >= 1000) return `${(n / 1000).toFixed(n >= 10_000 ? 0 : 1)}k+`;
    return String(n);
  };

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setStatus('loading');
    try {
      await newsletterApi.subscribe(email, locale);
      setStatus('success');
      setEmail('');
    } catch {
      setStatus('error');
    }
  };

  const TRUST_BADGES = [
    { icon: Shield, label: t('trustVerified') },
    { icon: Star,   label: t('trustRated') },
    { icon: Zap,    label: t('trustInstant') },
  ];

  const MARKETS = [
    { flag: '🇮🇶', name: t('marketIraq'),  detail: t('marketIraqDetail') },
    { flag: '🇦🇪', name: t('marketUae'),   detail: t('marketUaeDetail') },
    { flag: '🇨🇳', name: t('marketChina'), detail: t('marketChinaDetail') },
  ];

  return (
    <footer dir={rtl ? 'rtl' : 'ltr'} role="contentinfo" className="relative overflow-hidden" style={{ background: 'linear-gradient(180deg,var(--ink-900) 0%,#030710 100%)' }}>
      <div className="h-px" style={{ background: 'linear-gradient(90deg,transparent,rgba(201,168,76,0.45),transparent)' }} />

      {/* ── Country Presence Strip ──────────────────────────── */}
      <div className="border-b border-white/[0.04]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-6">
            <span className="text-[9px] uppercase tracking-[0.18em] text-white/20 font-black w-full text-center sm:w-auto">
              {t('ourMarkets')}
            </span>
            {MARKETS.map(({ flag, name, detail }) => (
              <div key={name}
                className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl
                           border border-white/[0.07] bg-white/[0.02]
                           hover:border-[rgba(201,168,76,0.18)] hover:bg-[rgba(201,168,76,0.03)]
                           transition-all duration-200">
                <span className="text-2xl">{flag}</span>
                <div>
                  <div className="text-xs font-bold text-white/65">{name}</div>
                  <div className="text-[9px] text-white/28 mt-0.5">{detail}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Newsletter / CTA Banner ─────────────────────────── */}
      <div className="border-b border-white/[0.05]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="relative overflow-hidden rounded-3xl p-8 sm:p-10 flex flex-col lg:flex-row gap-8 items-center justify-between"
               style={{ background: 'linear-gradient(135deg,rgba(11,21,37,0.9),rgba(8,15,28,0.95))', border: '1px solid rgba(201,168,76,0.18)' }}>
            <div className="absolute inset-0 pointer-events-none opacity-[0.025]"
              style={{ backgroundImage: 'radial-gradient(circle, rgba(201,168,76,0.8) 1px, transparent 1px)', backgroundSize: '28px 28px' }} />

            {/* Left: text */}
            <div className="text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-[0.18em] bg-[var(--gold-subtle)] border border-[var(--gold-glow)] text-[var(--gold)] mb-3">
                ● {t('stayAheadBadge')}
              </div>
              <h3 className="text-2xl font-display font-black text-white mb-2">
                {t('newsletterTitle')}
              </h3>
              <p className="text-white/40 text-sm max-w-md">
                {t('newsletterDesc')}
              </p>
              <div className="flex flex-wrap justify-center lg:justify-start gap-4 mt-4">
                {TRUST_BADGES.map(({ icon: Icon, label }) => (
                  <span key={label} className="flex items-center gap-1.5 text-xs text-white/45 hover:text-white/65 transition-colors duration-200 cursor-default">
                    <Icon className="w-3.5 h-3.5 text-[rgba(201,168,76,0.7)]" />
                    {label}
                  </span>
                ))}
              </div>
            </div>

            {/* Right: form */}
            <div className="w-full max-w-sm flex-shrink-0">
              {status === 'success' ? (
                <div className="flex items-center gap-3 px-5 py-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-bold text-emerald-400">{t('subscribedTitle')}</p>
                    <p className="text-xs text-emerald-300/60">{t('subscribedDesc')}</p>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubscribe} className="flex gap-2" aria-label={t('newsletterFormLabel')}>
                  <label htmlFor="newsletter-email" className="sr-only">{t('emailSrLabel')}</label>
                  <input
                    id="newsletter-email"
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder={t('emailPlaceholder')}
                    required
                    aria-required="true"
                    disabled={status === 'loading'}
                    className="flex-1 h-12 bg-white/[0.07] border border-white/[0.12] rounded-xl
                               px-4 text-white text-sm placeholder-white/25 outline-none
                               focus:border-[rgba(201,168,76,0.5)] focus:bg-white/[0.10] transition-all
                               disabled:opacity-60"
                  />
                  <button
                    type="submit"
                    aria-label={t('subscribeAriaLabel')}
                    disabled={status === 'loading'}
                    className="flex-shrink-0 inline-flex items-center gap-1.5 h-12 px-5 rounded-xl
                               text-[var(--ink-900)] text-sm font-bold transition-all
                               hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98]
                               disabled:opacity-70 disabled:pointer-events-none"
                    style={{ background: 'linear-gradient(135deg, #a87828 0%, var(--gold) 50%, #dab445 100%)', boxShadow: '0 4px 20px rgba(201,168,76,0.40)' }}
                  >
                    {status === 'loading' ? t('subscribing') : t('subscribeBtn')}
                    <ArrowRight className={`w-4 h-4 ${rtl ? 'rotate-180' : ''}`} />
                  </button>
                </form>
              )}
              {status === 'error' && (
                <p className="text-[11px] text-red-400 mt-2 flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                  {t('subscribeError')}
                </p>
              )}
              <p className="text-[10px] text-white/25 mt-2 text-center lg:text-left">
                {t('noSpam')}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Main footer links ───────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-14 pb-8">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-8 mb-12">

          {/* Brand column */}
          <div className="col-span-2 md:col-span-3 lg:col-span-1">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center font-black text-[var(--ink-900)] text-sm"
                   style={{ background: 'linear-gradient(135deg,var(--gold),#9e6e1e)' }}>
                <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden>
                  <path d="M3 13.5L6 6.5H14L17 13.5H3Z" fill="white" opacity=".92" />
                  <circle cx="6.5" cy="15" r="2" fill="white" />
                  <circle cx="13.5" cy="15" r="2" fill="white" />
                </svg>
              </div>
              <div>
                <span className="font-black text-white text-lg leading-none block">CarsAuto</span>
                <span className="text-[9px] text-[rgba(201,168,76,0.6)] uppercase tracking-widest">{t('premiumMarketplace')}</span>
              </div>
            </div>
            <p className="text-white/30 text-xs leading-relaxed mb-5 max-w-[200px]">
              {t('tagline')}
            </p>

            {/* Stats — real counts from GET /public/stats, not hardcoded */}
            <div className="grid grid-cols-2 gap-2 mb-5">
              {[
                ['statsListings', formatCount(stats?.activeListings)],
                ['statsDealers', formatCount(stats?.verifiedDealers)],
                ['statsCities', stats?.cities != null ? String(stats.cities) : '—'],
                ['statsRating', stats?.averageRating ? `${stats.averageRating}★` : '—'],
              ].map(([labelKey, value]) => (
                <div key={labelKey} className="rounded-xl bg-white/[0.04] border border-white/[0.05] px-3 py-2">
                  <p className="text-sm font-black text-[var(--gold)]">{value}</p>
                  <p className="text-[10px] text-white/25">{t(labelKey)}</p>
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              {SOCIAL_LINKS.map(({ Icon, href, label }) => (
                <a key={label} href={href} target="_blank" rel="noopener noreferrer" aria-label={label}
                      className="w-8 h-8 rounded-xl flex items-center justify-center
                                 bg-white/[0.05] border border-white/[0.08] text-white/35
                                 hover:border-[rgba(201,168,76,0.40)] hover:text-[var(--gold)] hover:bg-[rgba(201,168,76,0.08)]
                                 transition-all duration-200">
                  <Icon className="w-3.5 h-3.5" aria-hidden />
                </a>
              ))}
            </div>
          </div>

          {Object.entries(FOOTER_LINKS).map(([section, items]) => (
            <div key={section}>
              <h4 className="text-white font-bold text-sm mb-4 flex items-center gap-2">
                {t(`headings.${section}`)}
              </h4>
              <ul className="space-y-2.5">
                {items.map(({ key, href }) => (
                  <li key={key}>
                    <Link
                      href={href}
                      className="text-white/35 hover:text-[var(--gold)] text-xs transition-colors duration-200
                                 flex items-center gap-1 group"
                    >
                      <span className={`w-0 group-hover:w-2 overflow-hidden transition-all duration-200
                                       text-[var(--gold)] ${rtl ? 'scale-x-[-1]' : ''}`}>›</span>
                      {t(`links.${key}`)}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="h-px bg-white/[0.06] mb-8" />

        {/* Bottom */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-white/20 text-xs">
            © {new Date().getFullYear()} CarsAuto. {t('allRightsReserved')}
          </p>
          <div className="flex gap-5 flex-wrap justify-center">
            {[
              { key: 'privacyPolicy', href: '/privacy-policy' },
              { key: 'termsOfUse',    href: '/terms-of-use' },
              { key: 'cookiePolicy',  href: '/privacy-policy#cookies' },
            ].map(({ key, href }) => (
              <Link key={key} href={href}
                    className="text-white/20 hover:text-white/50 text-xs transition-colors duration-200">
                {t(`links.${key}`)}
              </Link>
            ))}
            {/* /sitemap.xml is a root-level static file outside the [locale] segment —
                a plain anchor avoids the i18n Link auto-prefixing it with the locale. */}
            <a href="/sitemap.xml"
               className="text-white/20 hover:text-white/50 text-xs transition-colors duration-200">
              {t('links.sitemap')}
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
