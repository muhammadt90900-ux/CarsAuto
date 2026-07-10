// apps/web/src/lib/monitoring.ts
// Client-side error tracking and performance monitoring for Next.js.
// Sends errors to the API's audit endpoint AND to Sentry (see
// sentry.client.config.ts for init — this file assumes Sentry.init() has
// already run, which withSentryConfig() guarantees happens before any
// component code executes).

import * as Sentry from '@sentry/nextjs';

export interface ClientError {
  message:    string;
  stack?:     string;
  component?: string;
  url:        string;
  userAgent:  string;
  timestamp:  string;
  traceId?:   string;
}

// Read trace ID set by the server (propagated via response headers)
function getTraceId(): string | undefined {
  if (typeof document === 'undefined') return undefined;
  return document.querySelector<HTMLMetaElement>('meta[name="x-trace-id"]')?.content;
}

// Report an error to the API (fire-and-forget)
export function reportError(error: Error, context?: string): void {
  if (typeof window === 'undefined') return;

  const payload: ClientError = {
    message:   error.message,
    stack:     error.stack,
    component: context,
    url:       window.location.href,
    userAgent: navigator.userAgent,
    timestamp: new Date().toISOString(),
    traceId:   getTraceId(),
  };

  // PROMPT 3: previously looked for `window.__sentry`, a global that
  // nothing in this codebase ever actually set — meaning every error.tsx
  // boundary that called this function silently never reached Sentry.
  // Now that @sentry/nextjs is installed and initialized (see
  // sentry.client.config.ts), call it directly.
  Sentry.withScope((scope) => {
    if (context) scope.setTag('page', context);
    Sentry.captureException(error);
  });

  // Send to API (non-blocking, best-effort)
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? '';
  fetch(`${apiUrl}/monitoring/client-error`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(payload),
    // Don't let this delay page unload
    keepalive: true,
  }).catch(() => {
    // Silent fail — monitoring should never break the app
  });

  // Always log to console in development
  if (process.env.NODE_ENV !== 'production') {
    console.error(`[${context ?? 'app'}]`, error);
  }
}

// Performance mark helper — sends Web Vitals to /api/monitoring/vitals
export function reportWebVital(metric: {
  name:   string;
  value:  number;
  rating: 'good' | 'needs-improvement' | 'poor';
  id:     string;
}): void {
  if (typeof window === 'undefined') return;

  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? '';
  fetch(`${apiUrl}/monitoring/vitals`, {
    method:    'POST',
    headers:   { 'Content-Type': 'application/json' },
    body:      JSON.stringify({ ...metric, url: window.location.href, timestamp: new Date().toISOString() }),
    keepalive: true,
  }).catch(() => {});
}
