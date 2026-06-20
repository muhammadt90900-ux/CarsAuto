// apps/web/src/app/[locale]/(protected)/layout.tsx
// Auth is enforced client-side via AuthGuard because in Codespaces
// the API runs on a different subdomain (cross-origin) and the
// refresh_token HttpOnly cookie is never visible to the Next.js server.

import { ReactNode } from 'react';
import { AuthGuard } from '@/components/shared/AuthGuard';

interface ProtectedLayoutProps {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}

export default async function ProtectedLayout({ children, params }: ProtectedLayoutProps) {
  const { locale } = await params;
  return (
    <AuthGuard locale={locale}>
      {children}
    </AuthGuard>
  );
}
