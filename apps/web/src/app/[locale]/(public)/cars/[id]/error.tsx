'use client';
// apps/web/src/app/[locale]/(public)/cars/[id]/error.tsx

import { useEffect } from 'react';
import Link from 'next/link';

export default function CarDetailError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error('[cars/[id]] page error:', error);
  }, [error]);

  return (
    <div className="max-w-2xl mx-auto px-4 py-20 text-center">
      <div className="text-5xl mb-4">😕</div>
      <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
        Something went wrong loading this listing
      </h2>
      <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">
        Please try again, or go back to browse other listings.
      </p>
      <div className="flex items-center justify-center gap-3">
        <button
          onClick={reset}
          className="inline-flex items-center justify-center h-10 px-5 rounded-xl font-semibold text-sm
                     bg-blue-600 text-white hover:bg-blue-700 transition-colors duration-150"
        >
          Try again
        </button>
        <Link
          href="/cars"
          className="inline-flex items-center justify-center h-10 px-5 rounded-xl font-semibold text-sm
                     border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-200
                     hover:bg-slate-50 dark:hover:bg-white/5 transition-colors duration-150"
        >
          Back to Cars
        </Link>
      </div>
    </div>
  );
}
