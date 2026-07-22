// apps/web/src/app/[locale]/(public)/beta/page.tsx
//
// "Coming Soon / Join Beta" — dealer lead-capture landing page ahead of
// public launch. Server component so it can export generateMetadata; the
// interactive form (client-side state/hooks) lives in BetaRegisterForm.tsx.
// Mirrors the (public)/dealers/register/page.tsx pattern used elsewhere.

import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import BetaRegisterForm from './BetaRegisterForm';
import { locales, hreflangMap, type Locale } from '@/i18n/config';

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://carsauto.com';

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale: _loc } = await params;
  const locale = _loc as Locale;
  const t = await getTranslations({ locale, namespace: 'beta' });

  const title = t('metaTitle');
  const desc = t('metaDescription');
  const canonical = `${BASE_URL}/${locale}/beta`;
  const languages: Record<string, string> = { 'x-default': `${BASE_URL}/ku/beta` };
  for (const loc of locales) {
    languages[hreflangMap[loc]] = `${BASE_URL}/${loc}/beta`;
  }

  const ogLocaleMap: Record<string, string> = { ku: 'ckb_IQ', ar: 'ar_IQ', en: 'en_US', zh: 'zh_CN' };

  return {
    title,
    description: desc,
    // Beta lead-capture page — not something we want indexed and surfaced
    // in search ahead of the real launch, but still fully crawlable/
    // shareable via direct/social links (unlike /admin, which is noindex
    // for a different reason — internal tooling).
    robots: { index: false, follow: true },
    openGraph: {
      type: 'website',
      siteName: 'CarsAuto',
      title,
      description: desc,
      url: canonical,
      locale: ogLocaleMap[locale] ?? 'en_US',
    },
    twitter: { card: 'summary', site: '@CarsAuto', title, description: desc },
    alternates: { canonical, languages },
  };
}

export default function BetaPage() {
  return <BetaRegisterForm />;
}
