// apps/web/src/instrumentation.ts
//
// PROMPT 3: Next.js's instrumentation hook (runs once, on server boot, in
// every runtime the app uses) — this is what actually loads
// sentry.server.config.ts / sentry.edge.config.ts. sentry.client.config.ts
// is NOT loaded from here; it's picked up separately by withSentryConfig()
// in next.config.js for the browser bundle.
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('../sentry.server.config');
  }
  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('../sentry.edge.config');
  }
}

// PROMPT 3: catches errors from Server Components / Server Actions / Route
// Handlers that neither an app/**/error.tsx boundary nor
// app/global-error.tsx ever sees (those two only catch render-time errors
// in the component tree — this hook is Next's own instrumentation point
// for the request/response lifecycle itself). See
// https://nextjs.org/docs/app/building-your-application/configuring/instrumentation
// for the exact set of cases this does and doesn't cover — verify against
// current docs for this Next.js version, since `onRequestError`'s coverage
// has changed across Next major versions.
export async function onRequestError(
  err: unknown,
  request: { path: string; method: string; headers: Record<string, string> },
  context: { routerKind: string; routePath: string; routeType: string },
) {
  const Sentry = await import('@sentry/nextjs');
  Sentry.captureRequestError(err, request as any, context as any);
}
