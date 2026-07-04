'use client';
// apps/web/src/app/[locale]/(auth)/error.tsx
//
// Catches render errors thrown by any page under the (auth) group
// (login, register, forgot-password, reset-password, verify-email).
// The (auth) layout already renders a centered card shell, so this
// only needs to fill that card rather than the whole viewport.

import { useEffect } from 'react';
import { useTranslations } from 'next-intl';

export default function AuthError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations();

  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error('[auth] page error:', error);
  }, [error]);

  return (
    <div className="text-center py-6">
      <div className="text-4xl mb-4">⚠️</div>
      <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
        {t('errors.serverError')}
      </h2>
      <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">
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
