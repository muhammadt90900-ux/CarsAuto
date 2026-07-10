// apps/worker/src/common/monitoring/sentry.init.ts
//   (mirrors apps/api/src/common/monitoring/sentry.init.ts — see that
//   file's header for why @sentry/node over @sentry/nestjs, and for the
//   PII-scrubbing rationale, both identical here)
import * as Sentry from '@sentry/node';

const SENSITIVE_BODY_FIELDS = new Set([
  'password', 'token', 'accessToken', 'refreshToken', 'otp', 'otpCode',
  'cardNumber', 'cvv', 'cvc', 'cardCvv', 'expiryMonth', 'expiryYear',
  'iban', 'accountNumber',
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
  const environment = process.env.NODE_ENV ?? 'development';
  const release = process.env.APP_VERSION ?? process.env.GIT_SHA ?? 'unknown';
  const defaultSampleRate = environment === 'production' ? 0.1 : 1.0;
  const tracesSampleRate = process.env.SENTRY_TRACES_SAMPLE_RATE
    ? Number(process.env.SENTRY_TRACES_SAMPLE_RATE)
    : defaultSampleRate;

  Sentry.init({
    dsn,
    environment,
    release: `carsauto-worker@${release}`,
    tracesSampleRate: Number.isFinite(tracesSampleRate) ? tracesSampleRate : defaultSampleRate,
    sendDefaultPii: false,
    beforeSend(event) {
      if (event.extra) event.extra = scrubBody(event.extra) as Record<string, unknown>;
      return event;
    },
  });
}
