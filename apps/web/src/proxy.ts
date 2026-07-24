import { NextRequest } from 'next/server';
import createIntlMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';

const intlMiddleware = createIntlMiddleware(routing);

export default function proxy(req: NextRequest) {
  return intlMiddleware(req);
}

export const config = {
  matcher: [
    // Skip Next internals, API routes, and any request path that contains a
    // dot (i.e. has a file extension — covers every static file under
    // /public: images, fonts, placeholder.jpg, manifest.json, etc.), plus
    // the offline fallback page which intentionally lives outside the
    // locale prefix.
    '/((?!api|_next/static|_next/image|offline|.*\\..*).*)',
  ],
};
