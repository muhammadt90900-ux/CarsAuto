'use client';
// apps/web/src/app/[locale]/admin/error.tsx
//
// Boundary for the whole /admin subtree (dashboard, listings, users, dealers,
// moderation, transactions, reports, subscriptions, featured, analytics,
// audit-logs, notifications). Renders inside AdminLayout, so the admin
// sidebar/header stay usable — only the content area shows the error.

import { useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { reportError } from '@/lib/monitoring';

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations();

  useEffect(() => {
    reportError(error, 'admin');
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
      <div className="text-5xl mb-4">⚠️</div>
      <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
        {t('errors.serverError')}
      </h2>
      <p className="text-slate-500 dark:text-slate-400 text-sm mb-6 max-w-sm">
        {t('errors.serverErrorDesc')}
      </p>
      <button
        onClick={reset}
        className="inline-flex items-center justify-center h-10 px-5 rounded-xl font-semibold text-sm
                   bg-blue-600 text-white hover:bg-blue-700 transition-colors duration-150"
      >
        {t('common.retry')}
      </button>
    </div>
  );
}
