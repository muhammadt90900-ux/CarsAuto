// apps/web/src/app/[locale]/(auth)/login/page.tsx
import type { Metadata } from 'next';
import { LoginForm } from '@/components/features/auth/LoginForm';
import { locales, hreflangMap, type Locale } from '@/i18n/config';

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://carsauto.com';

interface Props {
  params: Promise<{ locale: string }>;
}

const TITLES: Record<Locale, string> = {
  ku: 'چوونەژوورەوە | CarsAuto',
  ar: 'تسجيل الدخول | CarsAuto',
  en: 'Log In | CarsAuto',
  zh: '登录 | CarsAuto',
};

const DESCS: Record<Locale, string> = {
  ku: 'بچۆرە ژوورەوە بۆ هەژمارەکەت لە CarsAuto بۆ بەڕێوەبردنی ئیلانەکانت، دڵخوازەکانت و نامەکانت.',
  ar: 'سجّل الدخول إلى حسابك في CarsAuto لإدارة إعلاناتك ومفضلاتك ورسائلك.',
  en: 'Log in to your CarsAuto account to manage your listings, favorites, and messages.',
  zh: '登录您的 CarsAuto 账户以管理车源、收藏和消息。',
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale: _loc } = await params;
  const locale = _loc as Locale;
  const title = TITLES[locale] ?? TITLES.en;
  const description = DESCS[locale] ?? DESCS.en;
  const canonical = `${BASE_URL}/${locale}/login`;
  const languages: Record<string, string> = { 'x-default': `${BASE_URL}/ku/login` };
  for (const loc of locales) languages[hreflangMap[loc]] = `${BASE_URL}/${loc}/login`;

  return {
    title,
    description,
    alternates: { canonical, languages },
  };
}

export default async function LoginPage({ params }: Props) {
  const { locale } = await params;
  return <LoginForm locale={locale} />;
}