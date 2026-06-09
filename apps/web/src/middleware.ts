// apps/web/src/middleware.ts
import { NextRequest, NextResponse } from 'next/server';
import createIntlMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';
import { locales, defaultLocale } from './i18n/config';

const intlMiddleware = createIntlMiddleware(routing);

// Auth check is handled client-side via AuthGuard component
// because in Codespaces the API runs on a different subdomain (cross-origin)
// so refresh_token cookie is never sent to the Next.js origin.
export function middleware(req: NextRequest) {
  return intlMiddleware(req);
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|icons|manifest.json|sw.js|offline).*)',
  ],
};