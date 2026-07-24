'use client';
// apps/web/src/app/[locale]/dashboard/dealers/inventory/error.tsx

import { useEffect } from 'react';
import { reportError } from '@/lib/monitoring';

export default function InventoryError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error('[dealer-inventory] page error:', error);
    reportError(error, 'dealer-inventory');
  }, [error]);

  return (
    <div className="max-w-2xl mx-auto px-4 py-20 text-center">
      <div className="text-5xl mb-4">😕</div>
      <h2 className="text-xl font-bold text-white mb-2">
        Something went wrong loading your inventory
      </h2>
      <p className="text-white/40 text-sm mb-6">
        Please try again — if this keeps happening, the inventory service may be temporarily unavailable.
      </p>
      <button
        onClick={reset}
        className="inline-flex items-center justify-center h-10 px-5 rounded-xl font-semibold text-sm
                   bg-gradient-to-r from-[var(--gold)] to-[var(--gold-light)] text-ink-700 hover:opacity-90 transition-opacity"
      >
        Try again
      </button>
    </div>
  );
}
