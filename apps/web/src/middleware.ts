// apps/web/src/middleware.ts
import { NextRequest, NextResponse } from 'next/server';
import createIntlMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';           // ← routing import بکە
import { locales, defaultLocale } from './i18n/config';

const intlMiddleware = createIntlMiddleware(routing); // ← routing object بدە

const PROTECTED_ROUTES_PATTERN = new RegExp(
  '^/[a-z]{2}/(dashboard|admin|sell)'
);

export function middleware(req: NextRequest) {
  const res = intlMiddleware(req);

  if (PROTECTED_ROUTES_PATTERN.test(req.nextUrl.pathname)) {
    const hasRefreshToken = req.cookies.has('refresh_token'); // ← simulate نەبێت، ڕاستەقینە بپشکنە
    if (!hasRefreshToken) {
      const pathParts = req.nextUrl.pathname.split('/');
      const locale = pathParts[1] && locales.includes(pathParts[1] as any)
        ? pathParts[1]
        : defaultLocale;

      const loginUrl = new URL(`/${locale}/login`, req.url);
      loginUrl.searchParams.set('returnTo', req.nextUrl.pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return res;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|icons|manifest.json|sw.js|offline).*)',
  ],
};