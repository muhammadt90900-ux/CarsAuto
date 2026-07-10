// apps/web/sentry.edge.config.ts
//
// PROMPT 3: Edge-runtime Sentry init — covers src/proxy.ts (this repo's
// Next.js 16 middleware replacement, see that file) and any Route Handler
// that opts into `export const runtime = 'edge'`. Loaded via
// instrumentation.ts's register() when NEXT_RUNTIME === 'edge'.
//
// Deliberately minimal: the edge runtime doesn't support every Node API
// Sentry's full SDK uses, so @sentry/nextjs ships a trimmed-down edge
// build automatically when this file is the one that's loaded — no manual
// config needed here beyond dsn/environment/release, same values as
// sentry.server.config.ts.
import * as Sentry from '@sentry/nextjs';

const environment = process.env.NODE_ENV ?? 'development';
const release = process.env.APP_VERSION ?? process.env.GIT_SHA;

Sentry.init({
  dsn: process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment,
  release: release ? `carsauto-web@${release}` : undefined,
  tracesSampleRate: environment === 'production' ? 0.1 : 1.0,
  sendDefaultPii: false,
});
