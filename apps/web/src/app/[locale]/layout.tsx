// app/[locale]/layout.tsx
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, getTranslations } from 'next-intl/server';
import Script from 'next/script';
import { locales, dir, hreflangMap, type Locale } from '@/i18n/config';
import { fontVariables } from '@/lib/fonts';
import { safeJsonLd } from '@/lib/json-ld-safe';
import { Providers } from '@/components/Providers';
import { PWAProvider, InstallPrompt } from '@/components/pwa';
import { DevScriptWarningSuppressor } from '@/components/shared/DevScriptWarningSuppressor';
import { ErrorBoundary } from '@/components/shared/ErrorBoundary';
import '@/styles/globals.css';

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://carsauto.com';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale: localeStr } = await params;
  const locale = localeStr as Locale;
  if (!locales.includes(locale)) return {};

  const t = await getTranslations({ locale, namespace: 'meta' });

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

const organisationJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'CarsAuto',
  url: BASE_URL,
  logo: `${BASE_URL}/logo.png`,
  sameAs: [
    'https://www.facebook.com/CarsAuto',
    'https://twitter.com/CarsAuto',
    'https://www.instagram.com/CarsAuto',
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
  name: 'CarsAuto',
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

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params;

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
      className={`${fontVariables} dark`}
    >
      <head>
        <link rel="preconnect" href="https://res.cloudinary.com" />
        <link rel="dns-prefetch" href="https://res.cloudinary.com" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="CarsAuto" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        <link rel="apple-touch-icon" sizes="152x152" href="/icons/icon-152x152.png" />
        <link rel="apple-touch-icon" sizes="144x144" href="/icons/icon-144x144.png" />
        <link rel="apple-touch-icon" sizes="128x128" href="/icons/icon-128x128.png" />
        <meta name="msapplication-TileImage" content="/icons/icon-144x144.png" />
        <meta name="msapplication-TileColor" content="var(--ink-900)" />
        <meta name="msapplication-config" content="none" />
        <link rel="icon" type="image/png" sizes="96x96" href="/icons/icon-96x96.png" />
        <link rel="icon" type="image/png" sizes="32x32" href="/icons/icon-72x72.png" />
        {/*
         * JSON-LD structured data — plain <script> in <head> is correct here.
         * This is a Server Component: React renders these to raw HTML on the
         * server (SSR/SSG). They are never re-executed on the client, which is
         * exactly what we want for SEO crawlers.
         */}
        {/* safeJsonLd (not JSON.stringify) — defense-in-depth against </script> injection, even though this object is static today */}
        <script
          id="jsonld-organisation"
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: safeJsonLd(organisationJsonLd) }}
        />
        {/* safeJsonLd (not JSON.stringify) — defense-in-depth against </script> injection, even though this object is static today */}
        <script
          id="jsonld-website"
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: safeJsonLd(websiteJsonLd) }}
        />
      </head>
      <body className={`${bodyFontClass} antialiased`} suppressHydrationWarning>
        {/*
         * Anti-FOUC theme script — must run synchronously before first paint.
         *
         * ✅ next/script strategy="beforeInteractive" is the correct API here:
         *    Next.js injects it before hydration, so it runs before React touches
         *    the DOM. This avoids the React 19 "script tag in component" warning
         *    that fires when a raw <script> is placed inside JSX rendered on the
         *    client side.
         *
         * Logic:
         *   'light' in localStorage → remove dark class (user chose light)
         *   anything else (null / 'dark') → keep dark class (default = dark)
         *
         * suppressHydrationWarning on <html> absorbs any className mismatch
         * between SSR ("dark" always) and client (reads localStorage).
         */}
        <Script
          id="theme-init"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('carsauto-theme');if(t==='light'){document.documentElement.classList.remove('dark')}else{document.documentElement.classList.add('dark')}}catch(e){document.documentElement.classList.add('dark')}})()`,
          }}
        />
        {/* Silences the known Next.js 16.2 dev-only false-positive console
            error for the beforeInteractive script above — see the comment
            inside DevScriptWarningSuppressor.tsx for the upstream issue
            links. Renders nothing; dev-mode only. */}
        <DevScriptWarningSuppressor />
        <NextIntlClientProvider locale={locale} messages={messages}>
          {/*
           * error.tsx boundaries only catch errors thrown by *page* segments
           * beneath them — never errors thrown by this layout itself (e.g.
           * PWAProvider, Providers, InstallPrompt). Without this, a crash in
           * any of those would skip every route-level error.tsx and blow
           * away the whole shell via global-error.tsx. This ErrorBoundary
           * is the safety net for exactly that gap.
           */}
          <ErrorBoundary context="RootLayoutProviders">
            <PWAProvider>
              <Providers>{children}</Providers>
              <InstallPrompt />
            </PWAProvider>
          </ErrorBoundary>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
