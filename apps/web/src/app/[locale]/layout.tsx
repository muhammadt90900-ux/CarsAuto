// app/[locale]/layout.tsx
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, getTranslations } from 'next-intl/server';
import { locales, dir, hreflangMap, type Locale } from '@/i18n/config';
import { fontVariables } from '@/lib/fonts';
import { Providers } from '@/components/Providers';
import { PWAProvider, InstallPrompt } from '@/components/pwa';
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
        {/*
         * Anti-FOUC theme script — runs synchronously before first paint.
         * 'light' in localStorage → remove dark class (user chose light)
         * anything else (null / 'dark') → add dark class (default = dark)
         * suppressHydrationWarning on <html> absorbs the className difference
         * between SSR ("dark" always) and client (may differ per localStorage).
         */}
        <script
          suppressHydrationWarning
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('carsauto-theme');if(t==='light'){document.documentElement.classList.remove('dark')}else{document.documentElement.classList.add('dark')}}catch(e){document.documentElement.classList.add('dark')}})()`,
          }}
        />
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
        <meta name="msapplication-TileColor" content="#050b14" />
        <meta name="msapplication-config" content="none" />
        <link rel="icon" type="image/png" sizes="96x96" href="/icons/icon-96x96.png" />
        <link rel="icon" type="image/png" sizes="32x32" href="/icons/icon-72x72.png" />
        <script
          id="jsonld-organisation"
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organisationJsonLd) }}
        />
        <script
          id="jsonld-website"
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
        />
      </head>
      <body className={`${bodyFontClass} antialiased`} suppressHydrationWarning>
        <NextIntlClientProvider locale={locale} messages={messages}>
          <PWAProvider>
            <Providers>{children}</Providers>
            <InstallPrompt />
          </PWAProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
