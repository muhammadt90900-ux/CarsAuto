// app/[locale]/layout.tsx — Locale root layout
// Renders <html lang dir> and provides next-intl context.
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, getTranslations } from 'next-intl/server';
import { locales, dir, type Locale } from '@/i18n/config';
import { fontVariables } from '../layout';
import { Providers } from '@/components/Providers';

type Props = {
  children: React.ReactNode;
  params: { locale: string };
};

/** Generate locale-aware metadata per page */
export async function generateMetadata({
  params,
}: {
  params: { locale: string };
}): Promise<Metadata> {
  const locale = params.locale as Locale;
  if (!locales.includes(locale)) return {};

  const t = await getTranslations({ locale, namespace: 'meta' });

  // Build hreflang alternates for SEO
  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL ?? 'https://autobazaarpro.com';
  const alternates: Record<string, string> = {};
  for (const loc of locales) {
    alternates[loc === 'ku' ? 'ckb' : loc] = `${baseUrl}/${loc}`;
  }
  alternates['x-default'] = `${baseUrl}/ku`;

  return {
    title: t('homeTitle'),
    description: t('homeDesc'),
    alternates: {
      languages: alternates,
    },
  };
}

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({ children, params }: Props) {
  const locale = params.locale;

  // Validate locale — 404 if unknown
  if (!locales.includes(locale as Locale)) notFound();

  // Load messages server-side (next-intl caches these)
  const messages = await getMessages({ locale });

  const textDir = dir(locale);
  const isArabicScript = locale === 'ar' || locale === 'ku';
  const isChinese = locale === 'zh';

  // Build body font class: Arabic/Kurdish → Noto Arabic, Chinese → Noto SC, else DM Sans
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
      <body
        className={`${bodyFontClass} antialiased`}
        suppressHydrationWarning
      >
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
