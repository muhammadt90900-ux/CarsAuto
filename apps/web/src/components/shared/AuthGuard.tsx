'use client';
// apps/web/src/components/shared/AuthGuard.tsx
// Client-side auth guard — redirects to login if user is not authenticated.
// Used by (protected)/layout.tsx instead of server-side cookie check,
// because in Codespaces the API is cross-origin and refresh_token cookie
// cannot be read server-side.

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';

interface AuthGuardProps {
  children: React.ReactNode;
  locale: string;
}

export function AuthGuard({ children, locale }: AuthGuardProps) {
  const router   = useRouter();
  const pathname = usePathname();
  const { user, isHydrated } = useAuthStore();

  useEffect(() => {
    if (!isHydrated) return;          // wait for Zustand to rehydrate from localStorage
    if (!user) {
      router.replace(`/${locale}/login?returnTo=${pathname}`);
    }
  }, [isHydrated, user, locale, pathname, router]);

  // While hydrating or if not yet redirected, render nothing (or a spinner)
  if (!isHydrated || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <span className="w-8 h-8 border-2 border-[var(--gold)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return <>{children}</>;
}