// apps/web/src/lib/monitoring.ts
// Client-side error tracking and performance monitoring for Next.js.
// Sends errors to the API's audit endpoint; optional Sentry integration.

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

  // Forward to Sentry if loaded
  if ((window as any).__sentry) {
    try { (window as any).__sentry.captureException(error); } catch {}
  }

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
