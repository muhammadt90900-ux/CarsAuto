-- Migration: raw_sql_constraints
-- ─────────────────────────────────────────────────────────────────────────────
-- Database Audit (Prompt E) — bugs #5 and #15.
--
-- schema.prisma has comments scattered throughout promising constraints and
-- indexes "created in raw migration" / "enforced in raw SQL migration" that
-- never actually existed anywhere in prisma/migrations/. This file creates
-- all of them. Prisma cannot express any of these natively (partial indexes,
-- CHECK constraints, trigram/GIN indexes, and Unsupported() vector columns
-- are all outside what `prisma db push` / `prisma migrate` can generate), so
-- this file must be applied manually:
--
--   npx prisma db execute --file prisma/migrations/raw_sql_constraints/migration.sql --schema prisma/schema.prisma
--
-- Run this AFTER `npx prisma db push` (or `migrate deploy`) has created the
-- `listings`, `users`, `reviews`, `dealers`, `listing_vehicle_specs`,
-- `refresh_tokens`/"RefreshToken", and `subscriptions` tables from the fixed
-- schema.prisma — every statement below assumes those tables already exist.
-- All statements are idempotent (IF NOT EXISTS / DROP...IF EXISTS) and safe
-- to re-run.
-- ─────────────────────────────────────────────────────────────────────────────


-- ── Bug #5: pgvector embedding column + index ────────────────────────────────
-- `Listing.embedding` is declared as `Unsupported("vector(1536)")` in
-- schema.prisma, which Prisma deliberately never creates or migrates — it's
-- the documented way to tell Prisma "this column exists but I manage it
-- myself". Without this block the column (and the extension it depends on)
-- never actually existed in any database built from this migration history.

CREATE EXTENSION IF NOT EXISTS vector;

ALTER TABLE listings
  ADD COLUMN IF NOT EXISTS embedding vector(1536);

-- HNSW index for cosine-distance search (matches the `<=>` operator used in
-- search.service.ts semanticSearch() and embedding-sync.task.ts).
-- Requires pgvector >= 0.5.0. If your pgvector version is older, replace this
-- with: CREATE INDEX ... USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
CREATE INDEX IF NOT EXISTS listings_embedding_hnsw_idx
  ON listings USING hnsw (embedding vector_cosine_ops);


-- ── Bug #15: User.phone partial unique index ─────────────────────────────────
-- Non-null phones must be unique; NULL phones (not yet provided) must not
-- collide with each other. NOTE: the `User` model has no @@map, so its real
-- table name is the PascalCase "User" (quoting required), unlike most other
-- models in this schema.

CREATE UNIQUE INDEX IF NOT EXISTS "User_phone_unique_idx"
  ON "User" ("phone")
  WHERE "phone" IS NOT NULL;


-- ── Bug #15: RefreshToken composite lookup index ─────────────────────────────
-- The schema comment promises "a partial index for non-expired tokens", but
-- Postgres rejects volatile predicates like `WHERE "expiresAt" > now()` in a
-- partial index ("functions in index predicate must be marked IMMUTABLE") —
-- a partial index's WHERE clause is evaluated once at build/maintenance time,
-- not per-query, so it can't express "currently non-expired". The valid,
-- equivalent fix is a plain composite index covering the actual query
-- pattern (look up a user's tokens, newest expiry first); the existing
-- `expiresAt` index already supports the cleanup-job sweep.

CREATE INDEX IF NOT EXISTS "RefreshToken_userId_expiresAt_idx"
  ON "RefreshToken" ("userId", "expiresAt" DESC);


-- ── Bug #15: ListingVehicleSpec.vin partial unique constraint ────────────────
-- Duplicate VINs are currently allowed since nothing enforces uniqueness.

CREATE UNIQUE INDEX IF NOT EXISTS listing_vehicle_specs_vin_unique_idx
  ON listing_vehicle_specs ("vin")
  WHERE "vin" IS NOT NULL;


-- ── Bug #15: Review.rating CHECK constraint ───────────────────────────────────
-- Highest-priority item in bug #15 — without this, 0, -5, or 999 are all
-- valid inserts today and silently corrupt average-rating aggregates.

ALTER TABLE reviews
  DROP CONSTRAINT IF EXISTS reviews_rating_check;

ALTER TABLE reviews
  ADD CONSTRAINT reviews_rating_check CHECK (rating BETWEEN 1 AND 5);


-- ── Bug #15: Dealer name trigram indexes for autocomplete ───────────────────

CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS dealers_nameEn_trgm_idx
  ON dealers USING gin ("nameEn" gin_trgm_ops);

CREATE INDEX IF NOT EXISTS dealers_nameKu_trgm_idx
  ON dealers USING gin ("nameKu" gin_trgm_ops);

CREATE INDEX IF NOT EXISTS dealers_nameAr_trgm_idx
  ON dealers USING gin ("nameAr" gin_trgm_ops);


-- ── Bug #15: Listing full-text-search GIN indexes ────────────────────────────
-- Expression indexes matching exactly the to_tsvector() expressions used in
-- common/prisma/optimized-queries.ts fullTextSearch(), so the planner can
-- actually use them. One per locale (English/Arabic configs; Kurdish has no
-- dedicated Postgres FTS config, so 'simple' is used, matching that file).

CREATE INDEX IF NOT EXISTS listings_fts_en_idx
  ON listings USING gin (
    to_tsvector('english', COALESCE("titleEn", '') || ' ' || COALESCE("descriptionEn", ''))
  );

CREATE INDEX IF NOT EXISTS listings_fts_ar_idx
  ON listings USING gin (
    to_tsvector('arabic', COALESCE("titleAr", '') || ' ' || COALESCE("descriptionAr", ''))
  );

CREATE INDEX IF NOT EXISTS listings_fts_ku_idx
  ON listings USING gin (
    to_tsvector('simple', COALESCE("titleKu", '') || ' ' || COALESCE("descriptionKu", ''))
  );


-- ── Supporting bug #13: Subscription.status typo guard ───────────────────────
-- Subscription.status is intentionally a plain String (see schema.prisma
-- comment), written lowercase from payments.service.ts. This CHECK prevents
-- a typo like 'Active' from silently being written.

ALTER TABLE subscriptions
  DROP CONSTRAINT IF EXISTS subscriptions_status_check;

ALTER TABLE subscriptions
  ADD CONSTRAINT subscriptions_status_check
  CHECK (status IN ('inactive', 'active', 'past_due', 'cancelled', 'trialing'));
