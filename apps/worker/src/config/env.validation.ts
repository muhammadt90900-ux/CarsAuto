// apps/worker/src/config/env.validation.ts
//
// Deliberately minimal — NOT a copy of apps/api's env.validation.ts.
// The worker only touches Postgres, Redis, OpenAI (translation), and
// SMTP/Gmail (notification email); it never reads JWT secrets, CORS
// origins, Stripe keys, or upload config, so validating those here would
// just be noise (or, worse, a false failure if the worker's .env doesn't
// happen to carry every API-only variable).

import { Logger } from '@nestjs/common';

const logger = new Logger('WorkerEnvValidation');

export function validateWorkerEnv(): void {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!process.env.DATABASE_URL) {
    errors.push('DATABASE_URL is required — the worker reads/writes the same Postgres database as the API.');
  }

  if (!process.env.REDIS_URL) {
    errors.push('REDIS_URL is required — the worker consumes BullMQ jobs from the same Redis instance as the API.');
  }

  if (process.env.NODE_ENV === 'production') {
    if (process.env.DATABASE_URL?.includes('user:password@') || process.env.DATABASE_URL?.includes('CHANGE_ME')) {
      errors.push('DATABASE_URL contains placeholder credentials — set real values in production');
    }
    if (process.env.REDIS_URL?.includes('localhost') || process.env.REDIS_URL?.includes('127.0.0.1')) {
      errors.push('REDIS_URL points at localhost in production — set it to the shared Redis instance the API uses.');
    }
  }

  if (!process.env.OPENAI_API_KEY) {
    warnings.push('OPENAI_API_KEY is not set — "translations" jobs will no-op (OpenAiService degrades gracefully but nothing will actually be translated).');
  }

  const hasSmtp  = Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
  const hasGmail = Boolean(process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD);
  if (!hasSmtp && !hasGmail) {
    warnings.push('No SMTP_HOST or GMAIL_USER configured — "notifications" jobs will skip email delivery (push notifications, if configured, still work).');
  }

  for (const w of warnings) logger.warn(w);

  if (errors.length > 0) {
    logger.error('Worker environment validation failed:');
    for (const e of errors) logger.error(`  - ${e}`);
    throw new Error('Invalid worker environment configuration — see errors above.');
  }
}
