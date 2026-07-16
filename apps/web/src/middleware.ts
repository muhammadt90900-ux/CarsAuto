// apps/web/src/middleware.ts
//
// FIX (Bug #4 — error when switching languages): this file was missing
// entirely from the project. The app's i18n setup (i18n/routing.ts using
// `localePrefix: 'always'`, and i18n/navigation.ts's `createNavigation`,
// used by LanguageSwitcher and every `router.push`/`Link` in the app) is
// next-intl's App Router integration, which REQUIRES a middleware.ts at the
// app root to actually function:
//   - it negotiates/validates the locale segment on every request
//   - it sets the NEXT_LOCALE cookie so the choice persists across visits
//   - it performs the "/" → "/ku" (or the visitor's browser locale) redirect
//     that `localePrefix: 'always'` promises
// Without it, next-intl's client-side navigation helpers (the ones
// LanguageSwitcher and friends rely on) have no server-side middleware to
// coordinate with, which is what surfaced as an error when switching locales.
//
// Nothing else needs to change — routing.ts and navigation.ts were already
// configured correctly and just needed this file to actually run.

import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';

export default createMiddleware(routing);

export const config = {
  // Run on every path except: Next.js internals, API routes, and anything
  // that looks like a static file request (has a file extension).
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
};
