// ─────────────────────────────────────────────────────────────────────────────
// INTEGRATION INSTRUCTIONS
// Apply these changes to wire the payment system into the running app.
// ─────────────────────────────────────────────────────────────────────────────

// ─── 1. apps/api/src/main.ts ─────────────────────────────────────────────────
//
// Add the express.raw() middleware BEFORE the global validation pipe.
// This preserves the raw Buffer on /payments/webhook so Stripe HMAC works.
// All other routes continue to receive parsed JSON.
//
// Find the bootstrap() function and add:

/*
import express from 'express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    rawBody: true,   // ← enables rawBody support in NestJS 10+
  });

  // Raw body for Stripe webhook signature verification
  app.use(
    '/payments/webhook',
    express.raw({ type: 'application/json' }),
  );

  // ... rest of bootstrap (useGlobalPipes, etc.)
}
*/

// ─── 2. .env / .env.example additions ────────────────────────────────────────
//
// Add to apps/api/.env.example:

/*
# ── Stripe ────────────────────────────────────────────────────────────────────
# Get from: https://dashboard.stripe.com/apikeys
STRIPE_SECRET_KEY=sk_test_...

# Get from: https://dashboard.stripe.com/webhooks (after registering the endpoint)
# Endpoint URL: https://your-domain.com/api/payments/webhook
STRIPE_WEBHOOK_SECRET=whsec_...
*/

// ─── 3. apps/api/src/config/env.validation.ts additions ──────────────────────
//
// Add STRIPE_WEBHOOK_SECRET to the EnvConfig interface:

/*
interface EnvConfig {
  // ... existing fields ...
  STRIPE_SECRET_KEY?: string;
  STRIPE_WEBHOOK_SECRET?: string;   // ← add this
}

// Add validation in validateEnv():
if (process.env.STRIPE_SECRET_KEY && !process.env.STRIPE_WEBHOOK_SECRET) {
  warnings.push('STRIPE_SECRET_KEY is set but STRIPE_WEBHOOK_SECRET is missing — webhook validation will fail');
}
if (process.env.STRIPE_WEBHOOK_SECRET && !process.env.STRIPE_WEBHOOK_SECRET.startsWith('whsec_')) {
  errors.push('STRIPE_WEBHOOK_SECRET must start with whsec_');
}
*/

// ─── 4. Stripe dashboard — register webhook endpoint ─────────────────────────
//
// In Stripe Dashboard → Developers → Webhooks → Add endpoint:
//
//   URL: https://your-domain.com/api/payments/webhook
//
//   Events to listen for:
//     payment_intent.succeeded
//     payment_intent.payment_failed
//     payment_intent.canceled
//     charge.refunded
//     customer.subscription.updated
//     customer.subscription.deleted
//     invoice.payment_failed
//
// Copy the "Signing secret" (whsec_...) into STRIPE_WEBHOOK_SECRET.

// ─── 5. Install stripe package ───────────────────────────────────────────────
//
//   cd apps/api
//   pnpm add stripe
//   pnpm add -D @types/stripe   # if not already included

// ─── 6. Run Prisma migration ──────────────────────────────────────────────────
//
//   cd apps/api
//   pnpm prisma migrate dev --name payment_system
//
// Or apply the SQL migration manually from:
//   prisma/migrations/20260603_payment_system/migration.sql

// ─── 7. Frontend — replace confirmPayment with proper Stripe.js flow ──────────
//
// Old (broken) pattern:
//   await fetch('/api/payments', { method: 'POST', body: { plan, amount } });
//   await fetch(`/api/payments/${id}/confirm`, { method: 'PATCH' });
//
// New (correct) pattern:
//   1. POST /api/payments/intent  →  { clientSecret, paymentId }
//   2. Use Stripe.js to collect card:
//        const { error } = await stripe.confirmPayment({
//          elements,
//          clientSecret,
//          confirmParams: { return_url: 'https://yourapp.com/payment/complete' },
//        });
//   3. Stripe webhook (payment_intent.succeeded) updates DB automatically.
//   4. Poll GET /api/payments/:paymentId or use the return_url to show status.
