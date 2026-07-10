// apps/web/sentry.server.config.ts
//
// PROMPT 3: Node-runtime (SSR, Route Handlers, Server Actions) Sentry init.
// Loaded via instrumentation.ts's register() when NEXT_RUNTIME === 'nodejs'
// — do not import this manually anywhere else.
//
// Not NEXT_PUBLIC_* here — this runs server-side only and never ships to
// the browser, so a private, server-only SENTRY_DSN env var (distinct from
// the client's NEXT_PUBLIC_SENTRY_DSN) can be used if you want to route
// server vs. client events to different Sentry projects. This repo defaults
// to the SAME dsn value for both (set NEXT_PUBLIC_SENTRY_DSN and let this
// file fall back to it) — see docs/ERROR-TRACKING.md for the one-DSN vs.
// per-service-DSN tradeoff.
import * as Sentry from '@sentry/nextjs';

const environment = process.env.NODE_ENV ?? 'development';
const release = process.env.APP_VERSION ?? process.env.GIT_SHA;
const defaultSampleRate = environment === 'production' ? 0.1 : 1.0;

Sentry.init({
  dsn: process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment,
  release: release ? `carsauto-web@${release}` : undefined,
  tracesSampleRate: defaultSampleRate,
  sendDefaultPii: false,
  beforeSend(event) {
    if (event.request?.headers) {
      const headers = event.request.headers as Record<string, string>;
      if (headers.authorization) headers.authorization = '[Redacted]';
      if (headers.cookie) headers.cookie = '[Redacted]';
    }
    return event;
  },
});
