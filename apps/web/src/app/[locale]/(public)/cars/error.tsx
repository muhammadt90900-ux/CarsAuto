'use client';
// apps/web/src/app/[locale]/(public)/cars/error.tsx
//
// Next.js requires error.tsx to be a Client Component. Catches errors
// thrown during rendering of cars/page.tsx and its children (e.g. if
// CarsMarketplaceClient itself throws — the server-side serverFetch() call
// never throws, it returns null on failure, so this mainly guards against
// unexpected render-time errors further down the tree).

import { useEffect } from 'react';
import { reportError } from '@/lib/monitoring';

export default function CarsError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error('[cars] page error:', error);
    reportError(error, 'cars');
  }, [error]);

  return (
    <div className="max-w-2xl mx-auto px-4 py-20 text-center">
      <div className="text-5xl mb-4">😕</div>
      <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
        Something went wrong loading cars
      </h2>
      <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">
        Please try again — if this keeps happening, the listings service may be temporarily unavailable.
      </p>
      <button
        onClick={reset}
        className="inline-flex items-center justify-center h-10 px-5 rounded-xl font-semibold text-sm
                   bg-blue-600 text-white hover:bg-blue-700 transition-colors duration-150"
      >
        Try again
      </button>
    </div>
  );
}
