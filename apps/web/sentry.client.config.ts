// apps/web/sentry.client.config.ts
//
// PROMPT 3: browser-side Sentry init. Picked up automatically by
// withSentryConfig() in next.config.js — do not import this manually
// anywhere. Runs once per page load, before React hydrates.
//
// NEXT_PUBLIC_SENTRY_DSN (not SENTRY_DSN): this file ships in the CLIENT
// bundle, so the value has to be a NEXT_PUBLIC_* var baked in at build time
// by apps/web/Dockerfile (same reasoning as NEXT_PUBLIC_API_URL right above
// this ARG in that file). A Sentry DSN is not a secret in the traditional
// sense (see https://docs.sentry.io/product/sentry-basics/dsn-explainer/ —
// it can only be used to submit events, not read them), so this is safe.
import * as Sentry from '@sentry/nextjs';

const environment = process.env.NEXT_PUBLIC_APP_ENV ?? process.env.NODE_ENV ?? 'development';
const defaultSampleRate = environment === 'production' ? 0.1 : 1.0;

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment,
  release: process.env.NEXT_PUBLIC_APP_VERSION
    ? `carsauto-web@${process.env.NEXT_PUBLIC_APP_VERSION}`
    : undefined,
  tracesSampleRate: defaultSampleRate,
  // Session Replay is a Sentry add-on that records anonymized DOM
  // snapshots of user sessions — powerful for debugging but a much bigger
  // PII surface than error events alone (it can capture whatever text is
  // on screen, including listing prices/messages, unless every sensitive
  // element is manually masked). Left OFF by default; enabling it is a
  // deliberate follow-up decision, not bundled into this hardening pass —
  // see docs/ERROR-TRACKING.md.
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 0,
  sendDefaultPii: false,
  beforeSend(event) {
    // Client-side events can't carry request bodies the way server events
    // can, but breadcrumbs (console logs, XHR/fetch URLs+status, clicks)
    // can still leak an access token if it was ever put in a query string
    // or logged — scrub anything that looks like one out of breadcrumb data.
    if (event.breadcrumbs) {
      for (const crumb of event.breadcrumbs) {
        if (crumb.data && typeof crumb.data === 'object') {
          for (const key of Object.keys(crumb.data)) {
            if (/token|password|secret|authorization/i.test(key)) {
              (crumb.data as Record<string, unknown>)[key] = '[Redacted]';
            }
          }
        }
      }
    }
    return event;
  },
});
