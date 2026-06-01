-- CreateTable: email_verification_tokens
-- One active token per user; old tokens are replaced on resend.

CREATE TABLE "email_verification_tokens" (
    "id"        UUID         NOT NULL DEFAULT gen_random_uuid(),
    "userId"    UUID         NOT NULL,
    "tokenHash" TEXT         NOT NULL,
    "expiresAt" TIMESTAMPTZ  NOT NULL,
    "createdAt" TIMESTAMPTZ  NOT NULL DEFAULT now(),

    CONSTRAINT "email_verification_tokens_pkey" PRIMARY KEY ("id")
);

-- Unique constraint on tokenHash (lookup by raw token's hash)
CREATE UNIQUE INDEX "email_verification_tokens_tokenHash_key"
    ON "email_verification_tokens"("tokenHash");

-- Index for per-user lookups (replace/delete on resend)
CREATE INDEX "email_verification_tokens_userId_idx"
    ON "email_verification_tokens"("userId");

-- Partial index: only non-expired tokens need fast lookup
CREATE INDEX "email_verification_tokens_expiresAt_idx"
    ON "email_verification_tokens"("expiresAt")
    WHERE "expiresAt" > now();

-- Foreign key: cascade-delete tokens when user is removed
ALTER TABLE "email_verification_tokens"
    ADD CONSTRAINT "email_verification_tokens_userId_fkey"
    FOREIGN KEY ("userId")
    REFERENCES "User"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
