// apps/api/src/config/env.validation.ts
// Validates required environment variables at startup.
// The app will refuse to start rather than silently use bad defaults.

export interface EnvConfig {
  NODE_ENV: 'development' | 'production' | 'test';
  PORT: number;

  DATABASE_URL: string;
  REDIS_URL: string;

  JWT_SECRET: string;
  JWT_EXPIRES_IN: string;
  JWT_REFRESH_EXPIRES_IN: string;

  FRONTEND_URL: string;

  // Optional services
  GMAIL_USER?: string;
  GMAIL_APP_PASSWORD?: string;
  CLOUDINARY_CLOUD_NAME?: string;
  CLOUDINARY_API_KEY?: string;
  CLOUDINARY_API_SECRET?: string;
  OPENAI_API_KEY?: string;
  STRIPE_SECRET_KEY?: string;
  VAPID_PUBLIC_KEY?: string;
  VAPID_PRIVATE_KEY?: string;
  VAPID_EMAIL?: string;

  // Tuning
  THROTTLE_TTL?: number;
  THROTTLE_LIMIT?: number;
  SLOW_QUERY_THRESHOLD_MS?: number;
  CACHE_MAX_ENTRIES?: number;
  LOG_LEVEL?: string;
}

const INSECURE_DEFAULTS = new Set([
  'change-this-to-a-strong-random-secret-min-32-chars',
  'change-this-to-a-strong-secret',
  'change-this-to-another-strong-secret',
  'secret',
  'password',
]);

function validateEnv(): void {
  const errors: string[] = [];
  const isProd = process.env.NODE_ENV === 'production';

  // ── Required always ────────────────────────────────────────────────────────
  const required: Array<keyof EnvConfig> = [
    'DATABASE_URL',
    'REDIS_URL',
    'JWT_SECRET',
    'FRONTEND_URL',
  ];

  for (const key of required) {
    if (!process.env[key]) {
      errors.push(`Missing required env var: ${key}`);
    }
  }

  // ── Production-only checks ─────────────────────────────────────────────────
  if (isProd) {
    // Reject known insecure placeholder values
    const secrets: Array<keyof EnvConfig> = ['JWT_SECRET'];
    for (const key of secrets) {
      const val = process.env[key];
      if (val && INSECURE_DEFAULTS.has(val)) {
        errors.push(`${key} contains an insecure default value — set a real secret in production`);
      }
    }

    // JWT_SECRET should be long enough
    const jwtSecret = process.env.JWT_SECRET;
    if (jwtSecret && jwtSecret.length < 32) {
      errors.push('JWT_SECRET must be at least 32 characters');
    }

    // DB should not point to localhost in production
    const dbUrl = process.env.DATABASE_URL ?? '';
    if (dbUrl.includes('localhost') || dbUrl.includes('127.0.0.1')) {
      errors.push('DATABASE_URL points to localhost — use a proper production database');
    }

    if (!process.env.JWT_REFRESH_EXPIRES_IN) {
      errors.push('JWT_REFRESH_EXPIRES_IN is required in production');
    }
  }

  if (errors.length > 0) {
    console.error('\n❌ Environment validation failed:\n');
    for (const err of errors) {
      console.error(`   • ${err}`);
    }
    console.error('\nFix the above issues before starting the application.\n');
    process.exit(1);
  }
}

export { validateEnv };
