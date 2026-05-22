// apps/web/src/components/shared/Footer.tsx
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useParams } from 'next/navigation';

const TwitterX = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.737-8.835L1.254 2.25H8.08l4.253 5.622 5.91-5.622Zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
  </svg>
);
const Instagram = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r=".8" fill="currentColor" stroke="none"/>
  </svg>
);
const Facebook = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>
  </svg>
);
const YouTube = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M22.54 6.42a2.78 2.78 0 0 0-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46A2.78 2.78 0 0 0 1.46 6.42 29 29 0 0 0 1 12a29 29 0 0 0 .46 5.58 2.78 2.78 0 0 0 1.95 1.96C5.12 20 12 20 12 20s6.88 0 8.59-.46a2.78 2.78 0 0 0 1.96-1.96A29 29 0 0 0 23 12a29 29 0 0 0-.46-5.58zM9.75 15.02V8.98L15.5 12l-5.75 3.02z"/>
  </svg>
);
const WhatsApp = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/>
  </svg>
);

export function Footer({ className }: { className?: string }) {
  const t = useTranslations('common');
  const { locale } = useParams();
  const isRTL = locale === 'ar' || locale === 'ku';

  const marketplaceLinks = [
    { href: `/${locale}/cars`, label: t('cars') },
    { href: `/${locale}/motorcycles`, label: t('motorcycles') },
    { href: `/${locale}/spare-parts`, label: t('spareParts') },
    { href: `/${locale}/sell`, label: t('sellYourCar') ?? 'Sell Your Car' },
    { href: `/${locale}/dealers`, label: t('dealers') ?? 'Dealers' },
  ];

  const companyLinks = [
    { href: `/${locale}/about`, label: t('about') ?? 'About Us' },
    { href: `/${locale}/careers`, label: t('careers') ?? 'Careers' },
    { href: `/${locale}/press`, label: t('press') ?? 'Press' },
    { href: `/${locale}/blog`, label: t('blog') ?? 'Blog' },
  ];

  const supportLinks = [
    { href: `/${locale}/help`, label: t('helpCenter') ?? 'Help Center' },
    { href: `/${locale}/contact`, label: t('contact') ?? 'Contact Us' },
    { href: `/${locale}/faq`, label: t('faq') ?? 'FAQ' },
  ];

  const legalLinks = [
    { href: `/${locale}/privacy`, label: t('privacyPolicy') ?? 'Privacy Policy' },
    { href: `/${locale}/terms`, label: t('termsOfService') ?? 'Terms of Service' },
    { href: `/${locale}/cookies`, label: t('cookiePolicy') ?? 'Cookie Policy' },
  ];

  const socials = [
    { href: 'https://twitter.com/autobazaarpro', label: 'X (Twitter)', icon: <TwitterX /> },
    { href: 'https://instagram.com/autobazaarpro', label: 'Instagram', icon: <Instagram /> },
    { href: 'https://facebook.com/autobazaarpro', label: 'Facebook', icon: <Facebook /> },
    { href: 'https://youtube.com/@autobazaarpro', label: 'YouTube', icon: <YouTube /> },
    { href: 'https://wa.me/autobazaarpro', label: 'WhatsApp', icon: <WhatsApp /> },
  ];

  return (
    <footer
      dir={isRTL ? 'rtl' : 'ltr'}
      className={`relative bg-[#0a0a14] text-white overflow-hidden ${className ?? ''}`}
    >
      {/* ── Subtle top gradient border ── */}
      <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-[#e94560]/60 to-transparent" />

      {/* ── Ambient glow ── */}
      <div className="pointer-events-none absolute -top-32 left-1/2 -translate-x-1/2 w-[600px] h-[300px] rounded-full bg-[#e94560]/[0.04] blur-3xl" />

      {/* ── Main grid ── */}
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-10 lg:gap-8">

          {/* ── Brand column (spans 2 on lg) ── */}
          <div className="sm:col-span-2 lg:col-span-2 flex flex-col gap-5">
            {/* Logo */}
            <Link href={`/${locale}`} className="inline-flex items-center gap-2 group w-fit">
              <span className="flex items-center justify-center w-9 h-9 rounded-xl bg-[#e94560] shadow-[0_0_16px_rgba(233,69,96,0.4)] transition-transform duration-200 group-hover:scale-105 flex-shrink-0">
                <svg width="18" height="18" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <path d="M2 11L5 5h6l3 6H2Z" fill="white" opacity=".9"/>
                  <circle cx="5.5" cy="12.5" r="1.5" fill="white"/>
                  <circle cx="10.5" cy="12.5" r="1.5" fill="white"/>
                </svg>
              </span>
              <span className="text-xl font-extrabold tracking-tight leading-none">
                <span className="text-[#e94560]">Auto</span>
                <span className="text-white">Bazaar</span>
                <span className="text-[#e94560] font-black">Pro</span>
              </span>
            </Link>

            {/* Tagline */}
            <p className="text-sm text-gray-400 leading-relaxed max-w-xs">
              {t('tagline') ?? "The Middle East's most trusted premium automotive marketplace."}
            </p>

            {/* Social row */}
            <div className={`flex items-center gap-2 flex-wrap ${isRTL ? 'flex-row-reverse' : ''}`}>
              {socials.map(({ href, label, icon }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  className="flex items-center justify-center w-9 h-9 rounded-xl bg-white/[0.06] border border-white/[0.08] text-gray-400 hover:text-white hover:bg-[#e94560]/20 hover:border-[#e94560]/40 transition-all duration-200"
                >
                  {icon}
                </a>
              ))}
            </div>

            {/* App badges */}
            <div className={`flex items-center gap-2 flex-wrap ${isRTL ? 'flex-row-reverse' : ''}`}>
              <a href="#" className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/[0.06] border border-white/[0.08] hover:bg-white/10 hover:border-white/20 transition-all duration-200 text-xs font-medium text-gray-300 hover:text-white">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/></svg>
                App Store
              </a>
              <a href="#" className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/[0.06] border border-white/[0.08] hover:bg-white/10 hover:border-white/20 transition-all duration-200 text-xs font-medium text-gray-300 hover:text-white">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M3.18 23.76c.3.17.65.19.97.07l11.65-6.73-2.55-2.55-10.07 9.21zm-1.93-20.4C1.1 3.64 1 3.96 1 4.31v15.38c0 .35.1.67.25.95l.08.08 8.62-8.62v-.2L1.33 3.28l-.08.08zM20.49 10.7l-2.43-1.41-2.87 2.87 2.87 2.87 2.46-1.42c.7-.4.7-1.51-.03-1.91zm-17.31 12.5l10.07-9.22-2.55-2.55L1.25 22.8l1.93 1.4z"/></svg>
                Google Play
              </a>
            </div>
          </div>

          {/* ── Link columns ── */}
          {[
            { title: t('marketplace') ?? 'Marketplace', links: marketplaceLinks },
            { title: t('company') ?? 'Company', links: companyLinks },
            { title: t('support') ?? 'Support', links: supportLinks },
          ].map(({ title, links }) => (
            <div key={title} className="flex flex-col gap-4">
              <h4 className="text-xs font-bold tracking-[0.12em] uppercase text-[#e94560]">
                {title}
              </h4>
              <ul className="flex flex-col gap-2.5">
                {links.map(({ href, label }) => (
                  <li key={href}>
                    <Link
                      href={href}
                      className="text-sm text-gray-400 hover:text-white transition-colors duration-150 hover:underline underline-offset-2 decoration-[#e94560]/50"
                    >
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* ── Divider ── */}
        <div className="mt-12 mb-6 h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent" />

        {/* ── Bottom bar ── */}
        <div className={`flex flex-col sm:flex-row items-center justify-between gap-4 ${isRTL ? 'sm:flex-row-reverse' : ''}`}>
          <p className="text-xs text-gray-500 text-center sm:text-start">
            © {new Date().getFullYear()} AutoBazaar Pro.{' '}
            {t('allRightsReserved') ?? 'All rights reserved.'}
          </p>
          <div className={`flex items-center gap-4 flex-wrap justify-center ${isRTL ? 'flex-row-reverse' : ''}`}>
            {legalLinks.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className="text-xs text-gray-500 hover:text-gray-300 transition-colors duration-150"
              >
                {label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
