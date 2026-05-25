// i18n/config.ts — Production-grade i18n configuration
export const locales = ['ku', 'ar', 'en', 'zh'] as const;
export const defaultLocale = 'ku' as const;
export type Locale = (typeof locales)[number];

export const localeNames: Record<Locale, string> = {
  ku: 'کوردی',
  ar: 'العربية',
  en: 'English',
  zh: '中文',
};

/** Returns the text direction for a given locale */
export const dir = (locale: Locale | string): 'rtl' | 'ltr' => {
  return locale === 'ku' || locale === 'ar' ? 'rtl' : 'ltr';
};

/** Returns true if the locale is RTL */
export const isRTL = (locale: Locale | string): boolean =>
  locale === 'ku' || locale === 'ar';

/** Font family class to apply based on locale */
export const localeFontClass = (locale: Locale | string): string => {
  if (locale === 'ar' || locale === 'ku') return 'font-arabic';
  if (locale === 'zh') return 'font-sans';
  return 'font-sans';
};

/** hreflang map for SEO */
export const hreflangMap: Record<Locale, string> = {
  ku: 'ckb',   // Central Kurdish (Sorani)
  ar: 'ar',
  en: 'en',
  zh: 'zh',
};
