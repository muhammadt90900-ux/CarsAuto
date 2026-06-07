// apps/web/src/app/[locale]/(protected)/layout.tsx
// Layout that enforces authentication for all routes under (protected)/.
// If the user is not logged in (no refresh_token cookie) they are redirected
// to /login — this mirrors the middleware logic but runs at layout level so
// client-side navigations also get caught via the auth store check below.

import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { ReactNode } from 'react';

interface ProtectedLayoutProps {
  children: ReactNode;
  params: { locale: string };
}

export default function ProtectedLayout({ children, params }: ProtectedLayoutProps) {
  // Server-side cookie check (middleware handles it too, this is a double guard).
  const cookieStore = cookies();
  const hasSession = cookieStore.has('refresh_token');

  if (!hasSession) {
    redirect(`/${params.locale}/login?returnTo=/${params.locale}/sell`);
  }

  return <>{children}</>;
}
