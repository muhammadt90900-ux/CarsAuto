// i18n/request.ts — Server-side i18n request config for next-intl
import { getRequestConfig } from 'next-intl/server';
import { locales, defaultLocale, type Locale } from './config';

export default getRequestConfig(async ({ locale }) => {
  // Validate locale, fall back to default if invalid
  const validLocale = locales.includes(locale as Locale) ? locale : defaultLocale;

  const messages = (
    await import(`./translations/${validLocale}.json`)
  ).default;

  return {
    locale: validLocale,
    messages,
    // Suppress missing key errors in production; log in dev
    onError(error) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('[i18n]', error.message);
      }
    },
    getMessageFallback({ namespace, key }) {
      return `${namespace}.${key}`;
    },
  };
});
