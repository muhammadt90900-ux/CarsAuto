// apps/web/src/app/[locale]/(auth)/register/page.tsx
import type { Metadata } from 'next';
import { RegisterForm } from '@/components/features/auth/RegisterForm';
import { locales, hreflangMap, type Locale } from '@/i18n/config';

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://carsauto.com';

interface Props {
  params: Promise<{ locale: string }>;
}

const TITLES: Record<Locale, string> = {
  ku: 'خۆتۆمارکردن | CarsAuto',
  ar: 'إنشاء حساب | CarsAuto',
  en: 'Sign Up | CarsAuto',
  zh: '注册 | CarsAuto',
};

const DESCS: Record<Locale, string> = {
  ku: 'هەژمارێکی نوێ لە CarsAuto دروست بکە بۆ فرۆشتن و کڕینی ئۆتۆمبێل لە عێراق، کوردستان و ئیمارات.',
  ar: 'أنشئ حساباً جديداً في CarsAuto لبيع وشراء السيارات في العراق وكردستان والإمارات.',
  en: 'Create a free CarsAuto account to buy and sell vehicles across Iraq, Kurdistan & the UAE.',
  zh: '创建 CarsAuto 账户，在伊拉克、库尔德斯坦和阿联酋买卖车辆。',
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale: _loc } = await params;
  const locale = _loc as Locale;
  const title = TITLES[locale] ?? TITLES.en;
  const description = DESCS[locale] ?? DESCS.en;
  const canonical = `${BASE_URL}/${locale}/register`;
  const languages: Record<string, string> = { 'x-default': `${BASE_URL}/ku/register` };
  for (const loc of locales) languages[hreflangMap[loc]] = `${BASE_URL}/${loc}/register`;

  return {
    title,
    description,
    alternates: { canonical, languages },
  };
}

export default async function RegisterPage({ params }: Props) {
  const { locale } = await params;
  return <RegisterForm locale={locale} />;
}
