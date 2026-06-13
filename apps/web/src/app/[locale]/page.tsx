// apps/web/src/app/[locale]/page.tsx
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { locales, hreflangMap, type Locale } from '@/i18n/config';
import { PublicLayout } from '@/components/layouts/PublicLayout';
import { HeroSearch } from '@/components/features/home/HeroSearch';
import { FeaturedCars } from '@/components/features/home/FeaturedCars';
import { FeaturedDealers } from '@/components/features/home/FeaturedDealers';

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://autobazaarpro.com';

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale: localeStr } = await params;
  const locale = localeStr as Locale;
  const t = await getTranslations({ locale, namespace: 'meta' });
  const canonical = `${BASE_URL}/${locale}`;
  const languages: Record<string, string> = { 'x-default': `${BASE_URL}/ku` };
  for (const loc of locales) {
    languages[hreflangMap[loc]] = `${BASE_URL}/${loc}`;
  }
  return {
    title: t('homeTitle'),
    description: t('homeDesc'),
    alternates: { canonical, languages },
    openGraph: {
      type: 'website',
      siteName: 'AutoBazaar Pro',
      title: t('homeTitle'),
      description: t('homeDesc'),
      url: canonical,
      images: [{ url: `${BASE_URL}/og-home.jpg`, width: 1200, height: 630 }],
    },
  };
}

export default async function HomePage({ params }: Props) {
  const { locale } = await params;
  return (
    <PublicLayout locale={locale}>
      <HeroSearch locale={locale} />
      <FeaturedCars locale={locale} />
      <FeaturedDealers locale={locale} />
    </PublicLayout>
  );
}
