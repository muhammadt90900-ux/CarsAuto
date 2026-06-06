// apps/web/src/middleware.ts
import { NextRequest, NextResponse } from 'next/server';
import createIntlMiddleware from 'next-intl/middleware';
import { locales, defaultLocale } from './i18n/config';

const intlMiddleware = createIntlMiddleware({
  locales,
  defaultLocale,
  localePrefix: 'always',
});

// Protected routes that require authentication
const PROTECTED_ROUTES_PATTERN = new RegExp('^/[a-z]{2}/(dashboard|admin)');

/**
 * Middleware for:
 * 1. Locale routing (next-intl)
 * 2. Authentication checks on protected routes
 */
export function middleware(req: NextRequest) {
  // Apply locale routing first
  const res = intlMiddleware(req);

  // Check protected routes — must have refresh_token cookie
  if (PROTECTED_ROUTES_PATTERN.test(req.nextUrl.pathname)) {
    const hasRefreshToken = req.cookies.has('refresh_token');
    if (!hasRefreshToken) {
      // Extract locale from pathname
      const pathParts = req.nextUrl.pathname.split('/');
      const locale = (pathParts[1] && locales.includes(pathParts[1])) ? pathParts[1] : defaultLocale;
      // Redirect to login with returnTo parameter
      const loginUrl = new URL(`/${locale}/login`, req.url);
      loginUrl.searchParams.set('returnTo', req.nextUrl.pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return res;
}

export const config = {
  matcher: [
    // Match all paths except Next.js internals and static files
    '/((?!_next/static|_next/image|favicon.ico|icons|manifest.json|sw.js|offline).*)'
  ],
};
