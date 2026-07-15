// apps/web/src/app/[locale]/(public)/dealers/register/page.tsx
//
// AUDIT FIX (H4): this route previously had no metadata export at all —
// the only public page missing one (every other public page: cars,
// motorcycles, spare-parts, accessories, services, dealers, about,
// contact, privacy, terms all have generateMetadata). It's also a
// conversion-critical page (supply-side dealer acquisition), so it
// especially needed a real title/description for search and social
// sharing rather than inheriting the generic root title.
//
// Server component so it can export generateMetadata; the actual form
// (which needs client-side state/hooks) lives in DealerRegisterForm.tsx.

import type { Metadata } from 'next';
import DealerRegisterForm from './DealerRegisterForm';
import { locales, hreflangMap, type Locale } from '@/i18n/config';

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://carsauto.com';

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale: _loc } = await params;
  const locale = _loc as Locale;

  const titles: Record<Locale, string> = {
    ku: 'ببە بە دیلەر | CarsAuto',
    ar: 'كن وكيلاً | CarsAuto',
    en: 'Become a Dealer | CarsAuto',
    zh: '成为经销商 | CarsAuto',
  };
  const descs: Record<Locale, string> = {
    ku: 'خۆت تۆمار بکە وەک دیلەری پەسەندکراو لە CarsAuto و بگەرە بۆ سەدان کڕیار لە عێراق، کوردستان و ئیمارات.',
    ar: 'سجّل كوكيل سيارات معتمد على CarsAuto وابدأ الوصول إلى مئات المشترين في العراق وكردستان والإمارات.',
    en: 'Register your dealership on CarsAuto and reach verified buyers across Iraq, Kurdistan, and the UAE — verified badge, priority placement, and reviews included.',
    zh: '在 CarsAuto 注册您的经销商，触达伊拉克、库尔德斯坦和阿联酋的众多买家。',
  };

  const title = titles[locale] ?? titles.en;
  const desc = descs[locale] ?? descs.en;
  const canonical = `${BASE_URL}/${locale}/dealers/register`;
  const languages: Record<string, string> = { 'x-default': `${BASE_URL}/ku/dealers/register` };
  for (const loc of locales) {
    languages[hreflangMap[loc]] = `${BASE_URL}/${loc}/dealers/register`;
  }

  return {
    title,
    description: desc,
    openGraph: { type: 'website', siteName: 'CarsAuto', title, description: desc, url: canonical },
    twitter: { card: 'summary', site: '@CarsAuto', title, description: desc },
    alternates: { canonical, languages },
  };
}

export default function DealerRegisterPage() {
  return <DealerRegisterForm />;
}
