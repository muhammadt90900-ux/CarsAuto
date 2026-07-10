'use client';
// apps/web/src/app/[locale]/(protected)/sell/error.tsx
//
// Catches render errors in the multi-step SellCarForm. A crash mid-listing
// is high-stakes for the user (lost form progress), so the copy is a bit
// more reassuring than the generic boundary.

import { useEffect } from 'react';
import { reportError } from '@/lib/monitoring';
import { useTranslations } from 'next-intl';

export default function SellError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations();

  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error('[sell] page error:', error);
    reportError(error, 'sell');
  }, [error]);

  return (
    <div className="max-w-2xl mx-auto px-4 py-20 text-center">
      <div className="text-5xl mb-4">😕</div>
      <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
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
