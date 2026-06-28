// apps/web/src/lib/auth.ts
// Server-side auth helpers.

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export async function requireAdmin(): Promise<void> {
  const cookieStore = await cookies();
  // NOTE: the API only ever sets an HttpOnly `refresh_token` cookie
  // (see auth.controller.ts setRefreshCookie / @Post('refresh')). There is
  // no `access_token` cookie — the access token is only ever returned in the
  // JSON body and kept in memory on the client. So server-side, we exchange
  // the refresh_token cookie for a fresh access_token before calling /auth/me.
  const refreshToken = cookieStore.get('refresh_token')?.value;

  if (!refreshToken) {
    redirect('/en/login?next=/en/admin');
  }

  // BUG FIX: this code runs on the Next.js *server* (inside the Docker
  // network in production), so it must reach the API container by its
  // Docker service name (`http://api:4000/api`) — NOT by
  // NEXT_PUBLIC_API_URL, which is the *browser-facing* address
  // (`http://localhost:4000/api`) baked into the client bundle at build
  // time. Reusing NEXT_PUBLIC_API_URL here previously caused every
  // admin-page server check to fail to reach the API in Docker, redirecting
  // straight back to /login even with a valid ADMIN session.
  const apiUrl = process.env.INTERNAL_API_URL || process.env.NEXT_PUBLIC_API_URL;

  let isAdmin = false;

  try {
    const refreshRes = await fetch(`${apiUrl}/auth/refresh`, {
      method: 'POST',
      headers: { Cookie: `refresh_token=${refreshToken}` },
      cache: 'no-store',
    });

    if (refreshRes.ok) {
      const { access_token } = await refreshRes.json();
      const meRes = await fetch(`${apiUrl}/auth/me`, {
        headers: { Authorization: `Bearer ${access_token}` },
        cache: 'no-store',
      });
      if (meRes.ok) {
        const user = await meRes.json();
        isAdmin = user.role === 'ADMIN';
      }
    }
  } catch {
    isAdmin = false;
  }

  // redirect() must be called outside the try/catch — it works by throwing
  // a special NEXT_REDIRECT error that Next.js intercepts. Throwing it
  // inside our own try/catch above would get swallowed as a normal error.
  if (!isAdmin) {
    redirect('/en/login?next=/en/admin');
  }
}
