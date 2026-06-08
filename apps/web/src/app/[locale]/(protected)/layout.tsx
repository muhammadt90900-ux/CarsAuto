// apps/web/src/app/[locale]/(protected)/layout.tsx
// Layout that enforces authentication for all routes under (protected)/.
// If the user is not logged in (no refresh_token cookie) they are redirected
// to /login — this mirrors the middleware logic but runs at layout level so
// client-side navigations also get caught via the auth store check below.

import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { ReactNode } from 'react';

interface ProtectedLayoutProps {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}

export default async function ProtectedLayout({ children, params }: ProtectedLayoutProps) {
  const { locale } = await params;
  const cookieStore = await cookies();
  const hasSession = cookieStore.has('refresh_token');
  if (!hasSession) {
    redirect(`/${locale}/login?returnTo=/${locale}/sell`);
  }
  return <>{children}</>;
}