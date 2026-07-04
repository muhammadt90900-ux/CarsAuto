'use client';
// apps/web/src/app/[locale]/dashboard/error.tsx
//
// Boundary for the whole /dashboard subtree (overview, listings, messages,
// favorites, notifications, profile, reviews, subscription, dealers/*).
// Any nested route without its own error.tsx falls back to this one.
// Rendered inside DashboardLayout, so the sidebar/bottom nav stay intact —
// only the content area shows the error state.

import { useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { reportError } from '@/lib/monitoring';

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations();

  useEffect(() => {
    reportError(error, 'dashboard');
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
      <div className="text-5xl mb-4">⚠️</div>
      <h2 className="text-xl font-bold text-white mb-2">
        {t('errors.serverError')}
      </h2>
      <p className="text-white/50 text-sm mb-6 max-w-sm">
        {t('errors.serverErrorDesc')}
      </p>
      <button
        onClick={reset}
        className="inline-flex items-center justify-center h-10 px-5 rounded-xl font-semibold text-sm
                   bg-[#c9a84c] text-[#050b14] hover:bg-[#dab85f] transition-colors duration-150"
      >
        {t('common.retry')}
      </button>
    </div>
  );
}
