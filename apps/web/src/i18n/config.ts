// apps/web/src/i18n/config.ts
export const locales = ['ku', 'ar', 'en', 'zh'] as const;
export const defaultLocale = 'ku' as const;
export type Locale = (typeof locales)[number];

export const localeNames: Record<Locale, string> = {
  ku: 'کوردی',
  ar: 'العربية',
  en: 'English',
  zh: '中文',
};

export const dir = (locale: Locale): 'rtl' | 'ltr' => {
  return locale === 'ku' || locale === 'ar' ? 'rtl' : 'ltr';
};
