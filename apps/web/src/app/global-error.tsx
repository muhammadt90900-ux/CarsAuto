'use client';
// apps/web/src/app/global-error.tsx
//
// Last-resort boundary. Only fires if the ROOT layout ([locale]/layout.tsx
// or this file's own layout) throws — something error.tsx boundaries in
// route segments can never catch, since those live *inside* the layout.
// Because this replaces the entire <html>/<body>, it can't rely on
// NextIntlClientProvider, fonts, or global CSS — those may be exactly
// what's broken. Keep this dependency-free and inline-styled.

import { useEffect } from 'react';
import { reportError } from '@/lib/monitoring';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error('[global-error]', error);
    // PROMPT 3: this boundary only fires for errors the rest of the
    // component tree (route-segment error.tsx boundaries) never sees — see
    // this file's header — so it needs its own explicit report call, same
    // as every other error.tsx boundary in this app.
    reportError(error, 'global-error');
  }, [error]);

  return (
    <html>
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--ink-900)',
          color: '#fff',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        <div style={{ textAlign: 'center', padding: '1.5rem', maxWidth: '28rem' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⚠️</div>
          <h1 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem' }}>
            Something went wrong
          </h1>
          <p style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.6)', marginBottom: '1.5rem' }}>
            CarsAuto hit an unexpected error. Please try again — if this keeps happening, refresh the page.
          </p>
          <button
            onClick={reset}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '2.5rem',
              padding: '0 1.25rem',
              borderRadius: '0.75rem',
              fontWeight: 600,
              fontSize: '0.875rem',
              background: 'var(--gold)',
              color: 'var(--ink-900)',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
