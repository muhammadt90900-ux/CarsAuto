// middleware.ts — Production-grade locale middleware
import createMiddleware from 'next-intl/middleware';
import { locales, defaultLocale } from './i18n/config';

export default createMiddleware({
  locales,
  defaultLocale,
  localePrefix: 'always',       // Always show locale prefix in URL
  localeDetection: true,        // Auto-detect from Accept-Language header
});

export const config = {
  // Match all pathnames except API routes, Next.js internals, and static files
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\..*).*)',
  ],
};
