// app/[locale]/layout.tsx — Locale root layout
// Renders <html lang dir>, provides next-intl context, and injects
// locale-aware metadata + JSON-LD Organisation structured data.
import type { Metadata } from 'next';
import Script from 'next/script';
import { notFound } from 'next/navigation';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, getTranslations } from 'next-intl/server';
import { locales, dir, hreflangMap, type Locale } from '@/i18n/config';
import { fontVariables } from '../layout';
import { Providers } from '@/components/Providers';

type Props = {
  children: React.ReactNode;
  params: { locale: string };
};

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://autobazaarpro.com';

/* ── Locale-aware metadata ───────────────────────────────────── */
export async function generateMetadata({
  params,
}: {
  params: { locale: string };
}): Promise<Metadata> {
  const locale = params.locale as Locale;
  if (!locales.includes(locale)) return {};

  const t = await getTranslations({ locale, namespace: 'meta' });

  // Build hreflang alternates for all locales
  const languages: Record<string, string> = { 'x-default': `${BASE_URL}/ku` };
  for (const loc of locales) {
    languages[hreflangMap[loc]] = `${BASE_URL}/${loc}`;
  }

  const ogLocaleMap: Record<Locale, string> = {
    ku: 'ckb_IQ',
    ar: 'ar_IQ',
    en: 'en_US',
    zh: 'zh_CN',
  };

  return {
    title: t('homeTitle'),
    description: t('homeDesc'),
    alternates: {
      canonical: `${BASE_URL}/${locale}`,
      languages,
    },
    openGraph: {
      title: t('homeTitle'),
      description: t('homeDesc'),
      url: `${BASE_URL}/${locale}`,
      locale: ogLocaleMap[locale] ?? 'en_US',
      alternateLocale: Object.entries(ogLocaleMap)
        .filter(([l]) => l !== locale)
        .map(([, v]) => v),
    },
  };
}

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

/* ── Organisation JSON-LD ────────────────────────────────────── */
const organisationJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'AutoBazaar Pro',
  url: BASE_URL,
  logo: `${BASE_URL}/logo.png`,
  sameAs: [
    'https://www.facebook.com/AutoBazaarPro',
    'https://twitter.com/AutoBazaarPro',
    'https://www.instagram.com/AutoBazaarPro',
  ],
  contactPoint: {
    '@type': 'ContactPoint',
    contactType: 'customer service',
    availableLanguage: ['Kurdish', 'Arabic', 'English', 'Chinese'],
  },
  areaServed: ['IQ', 'AE', 'SA'],
};

const websiteJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'AutoBazaar Pro',
  url: BASE_URL,
  potentialAction: {
    '@type': 'SearchAction',
    target: {
      '@type': 'EntryPoint',
      urlTemplate: `${BASE_URL}/ku/cars?q={search_term_string}`,
    },
    'query-input': 'required name=search_term_string',
  },
};

/* ── Layout ──────────────────────────────────────────────────── */
export default async function LocaleLayout({ children, params }: Props) {
  const locale = params.locale;

  if (!locales.includes(locale as Locale)) notFound();

  const messages = await getMessages({ locale });

  const textDir = dir(locale);
  const isArabicScript = locale === 'ar' || locale === 'ku';
  const isChinese = locale === 'zh';

  const bodyFontClass = isArabicScript
    ? 'font-arabic'
    : isChinese
      ? 'font-chinese'
      : 'font-sans';

  return (
    <html
      lang={locale === 'ku' ? 'ckb' : locale}
      dir={textDir}
      suppressHydrationWarning
      className={fontVariables}
    >
      <head>
        {/* Preconnect to external services */}
        <link rel="preconnect" href="https://res.cloudinary.com" />
        <link rel="dns-prefetch" href="https://res.cloudinary.com" />
      </head>
      <body
        className={`${bodyFontClass} antialiased`}
        suppressHydrationWarning
      >
        {/* Organisation + WebSite structured data — injected once at root */}
        <Script
          id="jsonld-organisation"
          type="application/ld+json"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organisationJsonLd) }}
        />
        <Script
          id="jsonld-website"
          type="application/ld+json"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
        />

        <NextIntlClientProvider locale={locale} messages={messages}>
          <Providers>{children}</Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
