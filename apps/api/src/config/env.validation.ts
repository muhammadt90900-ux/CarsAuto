// apps/api/src/config/env.validation.ts
// Validates required environment variables at startup.
// The app will refuse to start rather than silently use bad defaults.

export interface EnvConfig {
  NODE_ENV: 'development' | 'production' | 'test';
  PORT: number;

  DATABASE_URL: string;
  REDIS_URL: string;

  JWT_SECRET: string;
  JWT_REFRESH_SECRET: string;
  JWT_EXPIRES_IN: string;
  JWT_REFRESH_EXPIRES_IN: string;

  FRONTEND_URL: string;

  EXCHANGE_RATE_API_KEY?: string;

  // Upload
  UPLOAD_DIR?: string;
  UPLOAD_BASE_URL?: string;

  // Optional services
  SMTP_HOST?: string;
  SMTP_PORT?: number;
  SMTP_SECURE?: string;
  SMTP_USER?: string;
  SMTP_PASS?: string;
  MAIL_FROM?: string;
  GMAIL_USER?: string;
  GMAIL_APP_PASSWORD?: string;
  CLOUDINARY_CLOUD_NAME?: string;
  CLOUDINARY_API_KEY?: string;
  CLOUDINARY_API_SECRET?: string;
  OPENAI_API_KEY?: string;
  STRIPE_SECRET_KEY?: string;
  STRIPE_WEBHOOK_SECRET?: string;
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

/** Known insecure placeholder values that must never reach production. */
const INSECURE_DEFAULTS = new Set([
  'change-this-to-a-strong-random-secret-min-32-chars',
  'change-this-to-a-strong-secret',
  'change-this-to-another-strong-secret',
  'CHANGE_ME_64_char_random_hex_secret',
  'CHANGE_ME_different_64_char_random_hex_secret',
  'CHANGE_ME_min_32_char_random_hex_secret',
  'CHANGE_ME_different_min_32_char_random_hex_secret',
  'secret',
  'password',
]);

function validateEnv(): void {
  const errors: string[] = [];
  const warnings: string[] = [];
  const isProd = process.env.NODE_ENV === 'production';

  // ── Required in all environments ────────────────────────────────────────────
  const required: Array<keyof EnvConfig> = [
    'DATABASE_URL',
    'REDIS_URL',
    'JWT_SECRET',
    'JWT_REFRESH_SECRET',
    'FRONTEND_URL',
  ];

  for (const key of required) {
    if (!process.env[key]) {
      errors.push(`Missing required env var: ${key}`);
    }
  }

  // ── Minimum secret length ──────────────────────────────────────────────────
  for (const key of ['JWT_SECRET', 'JWT_REFRESH_SECRET'] as const) {
    const val = process.env[key];
    if (val && val.length < 32) {
      errors.push(`${key} must be at least 32 characters (got ${val.length})`);
    }
  }

  // ── JWT_SECRET and JWT_REFRESH_SECRET must differ ─────────────────────────
  const jwtSecret = process.env.JWT_SECRET;
  const jwtRefresh = process.env.JWT_REFRESH_SECRET;
  if (jwtSecret && jwtRefresh && jwtSecret === jwtRefresh) {
    errors.push('JWT_SECRET and JWT_REFRESH_SECRET must be different values');
  }

  // ── Production-only checks ─────────────────────────────────────────────────
  if (isProd) {
    // Reject known insecure placeholder values
    const secrets: Array<keyof EnvConfig> = ['JWT_SECRET', 'JWT_REFRESH_SECRET'];
    for (const key of secrets) {
      const val = process.env[key];
      if (val && INSECURE_DEFAULTS.has(val)) {
        errors.push(
          `${key} contains an insecure placeholder — set a real secret in production`,
        );
      }
    }

    // DB must not point to localhost in production
    const dbUrl = process.env.DATABASE_URL ?? '';
    if (dbUrl.includes('localhost') || dbUrl.includes('127.0.0.1')) {
      errors.push(
        'DATABASE_URL points to localhost — use a proper production database host',
      );
    }

    // DB must not use the generic dev credentials
    if (dbUrl.includes('user:password@') || dbUrl.includes('CHANGE_ME')) {
      errors.push(
        'DATABASE_URL contains placeholder credentials — set real values in production',
      );
    }

    if (!process.env.JWT_REFRESH_EXPIRES_IN) {
      errors.push('JWT_REFRESH_EXPIRES_IN is required in production');
    }

    // ── Upload base URL validation ──────────────────────────────────────────────
    const uploadBaseUrl = process.env.UPLOAD_BASE_URL ?? '';
    if (
      uploadBaseUrl.includes('localhost') ||
      uploadBaseUrl.includes('127.0.0.1') ||
      uploadBaseUrl === ''
    ) {
      errors.push(
        'UPLOAD_BASE_URL must be set to a public-facing URL in production (not localhost). ' +
        'Set it to your CDN or server domain, e.g. https://cdn.carsauto.com/uploads',
      );
    }

    // ── Stripe validation ──────────────────────────────────────────────────────
    if (!process.env.STRIPE_SECRET_KEY) {
      warnings.push('STRIPE_SECRET_KEY is not set — payment features will be disabled');
    } else {
      if (!process.env.STRIPE_SECRET_KEY.startsWith('sk_')) {
        errors.push('STRIPE_SECRET_KEY must start with sk_live_ or sk_test_');
      }
      if (!process.env.STRIPE_WEBHOOK_SECRET) {
        errors.push(
          'STRIPE_WEBHOOK_SECRET is required when STRIPE_SECRET_KEY is set — without it webhook signature verification is disabled',
        );
      }
    }

    // ── Cloudinary validation ───────────────────────────────────────────────────
    const cloudinaryVars = [
      'CLOUDINARY_CLOUD_NAME',
      'CLOUDINARY_API_KEY',
      'CLOUDINARY_API_SECRET',
    ] as const;
    const cloudinarySet = cloudinaryVars.filter((v) => process.env[v]);
    if (cloudinarySet.length > 0 && cloudinarySet.length < 3) {
      errors.push(`Partial Cloudinary config — set all three: ${cloudinaryVars.join(', ')}`);
    } else if (cloudinarySet.length === 0) {
      warnings.push('Cloudinary not configured — image upload feature will be disabled');
    }

    // ── Email validation ────────────────────────────────────────────────────────
    const hasSmtp =
      process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS;
    const hasGmail =
      process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD;
    if (!hasSmtp && !hasGmail) {
      warnings.push('Email (SMTP) not configured — transactional emails will be skipped');
    }

    // ── Push notifications validation ───────────────────────────────────────────
    const hasVapid = process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY;
    if (!hasVapid) {
      warnings.push(
        'VAPID keys not configured — push notification feature will be disabled',
      );
    }
  }

  if (warnings.length > 0) {
    console.warn('\n⚠️  Environment warnings:\n');
    for (const warn of warnings) {
      console.warn(`   • ${warn}`);
    }
    console.warn('');
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
