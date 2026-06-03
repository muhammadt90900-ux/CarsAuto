-- Migration: Enhanced Payment System
-- Adds: gatewayId, gatewayStatus, metadata, failureReason, refundedAt, retryCount
-- Adds: TransactionLog model
-- Adds: Subscription model
-- Adds: WebhookEvent model (idempotency log)

-- ─── 1. Extend payments table ─────────────────────────────────────────────────
ALTER TABLE "payments"
  ADD COLUMN IF NOT EXISTS "gatewayId"      VARCHAR(255),
  ADD COLUMN IF NOT EXISTS "gatewayStatus"  VARCHAR(50),
  ADD COLUMN IF NOT EXISTS "metadata"       JSONB,
  ADD COLUMN IF NOT EXISTS "failureReason"  TEXT,
  ADD COLUMN IF NOT EXISTS "refundedAt"     TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS "refundAmount"   DECIMAL(12,2),
  ADD COLUMN IF NOT EXISTS "retryCount"     INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "nextRetryAt"    TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS "updatedAt"      TIMESTAMPTZ NOT NULL DEFAULT now();

-- Unique index for gateway idempotency
CREATE UNIQUE INDEX IF NOT EXISTS "payments_gatewayId_key"
  ON "payments"("gatewayId")
  WHERE "gatewayId" IS NOT NULL;

CREATE INDEX IF NOT EXISTS "payments_gatewayId_idx" ON "payments"("gatewayId");
CREATE INDEX IF NOT EXISTS "payments_nextRetryAt_idx" ON "payments"("nextRetryAt") WHERE "nextRetryAt" IS NOT NULL;

-- ─── 2. Transaction log ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "transaction_logs" (
  "id"          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "paymentId"   UUID NOT NULL REFERENCES "payments"("id") ON DELETE CASCADE,
  "event"       VARCHAR(100) NOT NULL,
  "status"      VARCHAR(50)  NOT NULL,
  "amount"      DECIMAL(12,2),
  "currency"    CHAR(3),
  "gatewayId"   VARCHAR(255),
  "gatewayData" JSONB,
  "errorMessage" TEXT,
  "createdAt"   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "transaction_logs_paymentId_idx" ON "transaction_logs"("paymentId");
CREATE INDEX IF NOT EXISTS "transaction_logs_event_idx"     ON "transaction_logs"("event");
CREATE INDEX IF NOT EXISTS "transaction_logs_createdAt_idx" ON "transaction_logs"("createdAt" DESC);

-- ─── 3. Webhook event log (idempotency) ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS "webhook_events" (
  "id"          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "gatewayId"   VARCHAR(255) NOT NULL UNIQUE,  -- e.g. Stripe event ID
  "type"        VARCHAR(100) NOT NULL,
  "payload"     JSONB NOT NULL,
  "processedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "error"       TEXT
);

CREATE INDEX IF NOT EXISTS "webhook_events_gatewayId_idx"   ON "webhook_events"("gatewayId");
CREATE INDEX IF NOT EXISTS "webhook_events_processedAt_idx" ON "webhook_events"("processedAt" DESC);

-- ─── 4. Subscriptions ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "subscriptions" (
  "id"                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId"               UUID NOT NULL UNIQUE REFERENCES "users"("id") ON DELETE CASCADE,
  "plan"                 VARCHAR(50)  NOT NULL DEFAULT 'FREE',
  "status"               VARCHAR(30)  NOT NULL DEFAULT 'inactive',
  "gatewaySubscriptionId" VARCHAR(255),
  "currentPeriodStart"   TIMESTAMPTZ,
  "currentPeriodEnd"     TIMESTAMPTZ,
  "cancelAtPeriodEnd"    BOOLEAN NOT NULL DEFAULT false,
  "cancelledAt"          TIMESTAMPTZ,
  "metadata"             JSONB,
  "createdAt"            TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt"            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "subscriptions_gatewaySubscriptionId_key"
  ON "subscriptions"("gatewaySubscriptionId")
  WHERE "gatewaySubscriptionId" IS NOT NULL;

CREATE INDEX IF NOT EXISTS "subscriptions_status_idx"  ON "subscriptions"("status");
CREATE INDEX IF NOT EXISTS "subscriptions_userId_idx"  ON "subscriptions"("userId");
CREATE INDEX IF NOT EXISTS "subscriptions_periodEnd_idx" ON "subscriptions"("currentPeriodEnd")
  WHERE "status" = 'active';
