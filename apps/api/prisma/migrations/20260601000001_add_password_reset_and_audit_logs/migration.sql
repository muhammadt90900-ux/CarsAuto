-- Migration: add_password_reset_and_audit_logs
-- Adds:
--   1. password_reset_tokens  — single-use, expiring, hashed tokens for password reset
--   2. audit_logs             — append-only security event log

-- ── password_reset_tokens ────────────────────────────────────────────────────

CREATE TABLE "password_reset_tokens" (
  "id"        UUID        NOT NULL DEFAULT gen_random_uuid(),
  "userId"    UUID        NOT NULL,
  "tokenHash" TEXT        NOT NULL,
  "expiresAt" TIMESTAMPTZ NOT NULL,
  "usedAt"    TIMESTAMPTZ,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT "password_reset_tokens_pkey"      PRIMARY KEY ("id"),
  CONSTRAINT "password_reset_tokens_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE,
  CONSTRAINT "password_reset_tokens_tokenHash_key" UNIQUE ("tokenHash")
);

-- Index for per-user token lookup and cleanup
CREATE INDEX "password_reset_tokens_userId_idx"    ON "password_reset_tokens"("userId");
-- Partial index: only non-expired, unused tokens — the hot path for verification
CREATE INDEX "password_reset_tokens_active_idx"
  ON "password_reset_tokens"("tokenHash")
  WHERE "usedAt" IS NULL AND "expiresAt" > now();
CREATE INDEX "password_reset_tokens_expiresAt_idx" ON "password_reset_tokens"("expiresAt");

-- ── audit_logs ───────────────────────────────────────────────────────────────

CREATE TABLE "audit_logs" (
  "id"        UUID        NOT NULL DEFAULT gen_random_uuid(),
  "userId"    UUID,
  "action"    TEXT        NOT NULL,
  "ipAddress" TEXT,
  "userAgent" TEXT,
  "meta"      JSONB,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "audit_logs_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL
);

CREATE INDEX "audit_logs_userId_idx"    ON "audit_logs"("userId");
CREATE INDEX "audit_logs_action_idx"    ON "audit_logs"("action");
CREATE INDEX "audit_logs_createdAt_idx" ON "audit_logs"("createdAt" DESC);
-- Composite for "show all password events for this user ordered by time"
CREATE INDEX "audit_logs_userId_action_createdAt_idx"
  ON "audit_logs"("userId", "action", "createdAt" DESC);
