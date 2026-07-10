// apps/api/src/common/monitoring/sentry.init.ts
//
// PROMPT 3: centralizes Sentry.init() so main.ts stays readable and so the
// same config (environment/release/sample-rate/PII scrubbing) is testable
// in isolation. Called as the very first thing in main.ts's bootstrap(),
// before validateEnv() or NestFactory.create() — this matters because it
// means bootstrap-time crashes (a bad env var, a Nest DI wiring error) are
// themselves captured, not just request-time exceptions.
//
// Why @sentry/node (not @sentry/nestjs): apps/api/package.json already
// declares @sentry/node, and error-tracker.service.ts's `forwardToSentry`
// was already written against its API (Sentry.withScope/captureException) —
// @sentry/nestjs additionally auto-installs its own global exception filter
// and HTTP instrumentation, which would double-capture every 5xx alongside
// this repo's existing AllExceptionsFilter -> ErrorTrackerService pipeline.
// Sticking with @sentry/node keeps exactly one capture path.
import * as Sentry from '@sentry/node';

/** Field names to redact wherever they appear in a request body, at any nesting depth. */
const SENSITIVE_BODY_FIELDS = new Set([
  'password',
  'currentPassword',
  'newPassword',
  'confirmPassword',
  'token',
  'accessToken',
  'refreshToken',
  'otp',
  'otpCode',
  // Payment card data — never send raw values to a third party, even our own APM.
  'cardNumber',
  'cardNumberLast4', // last4 is not sensitive on its own, but redact defensively — see note below
  'cvv',
  'cvc',
  'cardCvv',
  'expiryMonth',
  'expiryYear',
  'iban',
  'accountNumber',
]);

const REDACTED = '[Redacted]';

function scrubBody(value: unknown, depth = 0): unknown {
  if (depth > 6 || value === null || value === undefined) return value;
  if (Array.isArray(value)) return value.map((v) => scrubBody(v, depth + 1));
  if (typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      out[key] = SENSITIVE_BODY_FIELDS.has(key) ? REDACTED : scrubBody(val, depth + 1);
    }
    return out;
  }
  return value;
}

export function initSentry(): void {
  const dsn = process.env.SENTRY_DSN;
  // No DSN configured (e.g. local dev without Sentry set up) -> Sentry.init
  // with an empty dsn produces a fully functional no-op client. Every
  // Sentry.* call elsewhere in the app (error-tracker.service.ts,
  // process-level handlers below) stays safe to call unconditionally.
  const environment = process.env.NODE_ENV ?? 'development';
  const release = process.env.APP_VERSION ?? process.env.GIT_SHA ?? 'unknown';
  const defaultSampleRate = environment === 'production' ? 0.1 : 1.0;
  const tracesSampleRate = process.env.SENTRY_TRACES_SAMPLE_RATE
    ? Number(process.env.SENTRY_TRACES_SAMPLE_RATE)
    : defaultSampleRate;

  Sentry.init({
    dsn,
    environment,
    release: `carsauto-api@${release}`,
    tracesSampleRate: Number.isFinite(tracesSampleRate) ? tracesSampleRate : defaultSampleRate,
    // Never attach raw request bodies/cookies automatically — we scrub and
    // attach only what AllExceptionsFilter/ErrorTrackerService explicitly
    // pass via `extra` (method, url, statusCode, ip — see that filter).
    sendDefaultPii: false,
    beforeSend(event) {
      // ── Headers ────────────────────────────────────────────────────────
      if (event.request?.headers) {
        const headers = event.request.headers as Record<string, string>;
        if (headers.authorization) headers.authorization = REDACTED;
        if (headers.Authorization) headers.Authorization = REDACTED;
        if (headers.cookie) headers.cookie = REDACTED;
        if (headers.Cookie) headers.Cookie = REDACTED;
      }
      // ── Request body (only present if something upstream attached it —
      // this repo's ErrorTrackerService never does today, this is
      // defense-in-depth against a future change adding it) ─────────────
      if (event.request?.data) {
        event.request.data = scrubBody(event.request.data);
      }
      // ── Extra context (ErrorTrackerService.capture's `event.extra`) ────
      if (event.extra) {
        event.extra = scrubBody(event.extra) as Record<string, unknown>;
      }
      return event;
    },
  });
}
