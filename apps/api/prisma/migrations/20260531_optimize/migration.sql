-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: 20260531_optimize
-- AutoBazaarPro — Database performance & correctness optimization
-- Apply after existing migrations. All indexes use CONCURRENTLY.
-- ─────────────────────────────────────────────────────────────────────────────

-- ═══════════════════════════════════════════════════════════════════════════
-- SECTION 1: RENAME TABLES TO snake_case
-- Safer to run each rename in a transaction; Prisma @@map handles the mapping.
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE "User"                   RENAME TO users;
ALTER TABLE "Listing"                RENAME TO listings;
ALTER TABLE "Image"                  RENAME TO images;
ALTER TABLE "Category"               RENAME TO categories;
ALTER TABLE "Location"               RENAME TO locations;
ALTER TABLE "Chat"                   RENAME TO chats;
ALTER TABLE "Message"                RENAME TO messages;
ALTER TABLE "Notification"           RENAME TO notifications;
ALTER TABLE "Review"                 RENAME TO reviews;
ALTER TABLE "Payment"                RENAME TO payments;
ALTER TABLE "Report"                 RENAME TO reports;
ALTER TABLE "Favorite"               RENAME TO favorites;
ALTER TABLE "SavedSearch"            RENAME TO saved_searches;
ALTER TABLE "PushSubscription"       RENAME TO push_subscriptions;
ALTER TABLE "NotificationPreference" RENAME TO notification_preferences;
ALTER TABLE "RefreshToken"           RENAME TO refresh_tokens;
ALTER TABLE "MessageReadReceipt"     RENAME TO message_read_receipts;
ALTER TABLE "CarBrand"               RENAME TO car_brands;
ALTER TABLE "CarModel"               RENAME TO car_models;
ALTER TABLE "CarModelGeneration"     RENAME TO car_model_generations;
ALTER TABLE "CarTrim"                RENAME TO car_trims;
ALTER TABLE "ListingVehicleSpec"     RENAME TO listing_vehicle_specs;
ALTER TABLE "PartCompatibility"      RENAME TO part_compatibilities;
ALTER TABLE "Dealer"                 RENAME TO dealers;
ALTER TABLE "ShowroomImage"          RENAME TO showroom_images;
ALTER TABLE "DealerReview"           RENAME TO dealer_reviews;
ALTER TABLE "DealerBadge"            RENAME TO dealer_badges;
ALTER TABLE "DealerAnalytic"         RENAME TO dealer_analytics;
ALTER TABLE "DealerSubscription"     RENAME TO dealer_subscriptions;
ALTER TABLE "DealerContactRequest"   RENAME TO dealer_contact_requests;

-- ═══════════════════════════════════════════════════════════════════════════
-- SECTION 2: TYPE CORRECTIONS
-- ═══════════════════════════════════════════════════════════════════════════

-- 2.1 Listing.price → NUMERIC(12,2) — Float loses cents
ALTER TABLE listings
  ALTER COLUMN price TYPE NUMERIC(12,2) USING price::NUMERIC(12,2);

-- 2.2 Listing.views → BIGINT — popular listings can exceed 2.1B INT max
ALTER TABLE listings
  ALTER COLUMN views TYPE BIGINT USING views::BIGINT;

-- 2.3 Location lat/lng → NUMERIC(9,6) — Float drifts at 6 decimal places
ALTER TABLE locations
  ALTER COLUMN lat TYPE NUMERIC(9,6) USING lat::NUMERIC(9,6),
  ALTER COLUMN lng TYPE NUMERIC(9,6) USING lng::NUMERIC(9,6);

-- 2.4 Dealer lat/lng
ALTER TABLE dealers
  ALTER COLUMN lat TYPE NUMERIC(9,6) USING lat::NUMERIC(9,6),
  ALTER COLUMN lng TYPE NUMERIC(9,6) USING lng::NUMERIC(9,6);

-- 2.5 Dealer.averageRating → NUMERIC(3,2)
ALTER TABLE dealers
  ALTER COLUMN "averageRating" TYPE NUMERIC(3,2) USING "averageRating"::NUMERIC(3,2);

-- 2.6 Dealer.totalViews → BIGINT
ALTER TABLE dealers
  ALTER COLUMN "totalViews" TYPE BIGINT USING "totalViews"::BIGINT;

-- 2.7 Payment.amount → NUMERIC(12,2)
ALTER TABLE payments
  ALTER COLUMN amount TYPE NUMERIC(12,2) USING amount::NUMERIC(12,2);

-- 2.8 DealerSubscription.amount → NUMERIC(12,2)
ALTER TABLE dealer_subscriptions
  ALTER COLUMN amount TYPE NUMERIC(12,2) USING amount::NUMERIC(12,2);

-- ═══════════════════════════════════════════════════════════════════════════
-- SECTION 3: SOFT DELETE COLUMNS
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE users    ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMPTZ;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMPTZ;

-- ═══════════════════════════════════════════════════════════════════════════
-- SECTION 4: CHECK CONSTRAINTS
-- ═══════════════════════════════════════════════════════════════════════════

-- 4.1 Review rating must be 1-5
ALTER TABLE reviews
  ADD CONSTRAINT reviews_rating_range CHECK (rating BETWEEN 1 AND 5);

ALTER TABLE dealer_reviews
  ADD CONSTRAINT dealer_reviews_rating_range CHECK (rating BETWEEN 1 AND 5);

ALTER TABLE dealer_reviews
  ADD CONSTRAINT dealer_reviews_service_range  CHECK ("ratingService"  IS NULL OR "ratingService"  BETWEEN 1 AND 5),
  ADD CONSTRAINT dealer_reviews_price_range    CHECK ("ratingPrice"    IS NULL OR "ratingPrice"    BETWEEN 1 AND 5),
  ADD CONSTRAINT dealer_reviews_quality_range  CHECK ("ratingQuality"  IS NULL OR "ratingQuality"  BETWEEN 1 AND 5);

-- 4.2 Year plausibility for vehicle specs
ALTER TABLE listing_vehicle_specs
  ADD CONSTRAINT lvs_year_range CHECK (year IS NULL OR (year BETWEEN 1900 AND 2100));

ALTER TABLE car_model_generations
  ADD CONSTRAINT gen_year_range CHECK ("yearFrom" BETWEEN 1900 AND 2100
    AND ("yearTo" IS NULL OR "yearTo" >= "yearFrom"));

-- 4.3 Mileage non-negative
ALTER TABLE listing_vehicle_specs
  ADD CONSTRAINT lvs_mileage_positive CHECK ("mileageKm" IS NULL OR "mileageKm" >= 0);

-- 4.4 Price non-negative
ALTER TABLE listings
  ADD CONSTRAINT listings_price_positive CHECK (price >= 0);

-- 4.5 Dealer response rate 0-100
ALTER TABLE dealers
  ADD CONSTRAINT dealers_response_rate_range CHECK ("responseRate" BETWEEN 0 AND 100);

-- 4.6 Dealer average rating 0-5
ALTER TABLE dealers
  ADD CONSTRAINT dealers_rating_range CHECK ("averageRating" BETWEEN 0 AND 5);

-- 4.7 VIN format (17 alphanumeric chars, no I/O/Q)
ALTER TABLE listing_vehicle_specs
  ADD CONSTRAINT lvs_vin_format CHECK (
    vin IS NULL OR (
      LENGTH(vin) = 17
      AND vin ~ '^[A-HJ-NPR-Z0-9]{17}$'
    )
  );

-- ═══════════════════════════════════════════════════════════════════════════
-- SECTION 5: UNIQUE CONSTRAINTS
-- ═══════════════════════════════════════════════════════════════════════════

-- 5.1 VIN unique where non-null (partial unique index)
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS listing_vin_unique_idx
  ON listing_vehicle_specs (vin)
  WHERE vin IS NOT NULL;

-- 5.2 Prevent duplicate chats between same buyer + listing
ALTER TABLE chats
  ADD CONSTRAINT chats_listing_buyer_unique UNIQUE ("listingId", "buyerId");

-- 5.3 One review per user per reviewee
ALTER TABLE reviews
  ADD CONSTRAINT reviews_reviewer_reviewee_unique UNIQUE ("reviewerId", "revieweeId");

-- 5.4 User phone unique where non-null
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS users_phone_unique_idx
  ON users (phone)
  WHERE phone IS NOT NULL;

-- ═══════════════════════════════════════════════════════════════════════════
-- SECTION 6: CASCADE FIX — old schema used RESTRICT in some places
-- ═══════════════════════════════════════════════════════════════════════════

-- Message → Chat: should cascade (chat deleted → messages deleted)
ALTER TABLE messages
  DROP CONSTRAINT IF EXISTS "Message_chatId_fkey",
  ADD  CONSTRAINT "messages_chatId_fkey"
    FOREIGN KEY ("chatId") REFERENCES chats(id) ON DELETE CASCADE;

-- Notification → User: should cascade (user deleted → notifications gone)
ALTER TABLE notifications
  DROP CONSTRAINT IF EXISTS "Notification_userId_fkey",
  ADD  CONSTRAINT "notifications_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES users(id) ON DELETE CASCADE;

-- ═══════════════════════════════════════════════════════════════════════════
-- SECTION 7: FULL-TEXT SEARCH
-- GIN indexes on tsvector expressions for multilingual search.
-- Maintained automatically by expression indexes (no trigger needed).
-- ═══════════════════════════════════════════════════════════════════════════

-- 7.1 English titles
CREATE INDEX CONCURRENTLY IF NOT EXISTS listings_fts_en_idx
  ON listings USING GIN (
    to_tsvector('english', COALESCE("titleEn", '') || ' ' || COALESCE("descriptionEn", ''))
  );

-- 7.2 Arabic titles (simple — no Arabic stemmer in vanilla PG)
CREATE INDEX CONCURRENTLY IF NOT EXISTS listings_fts_ar_idx
  ON listings USING GIN (
    to_tsvector('arabic', COALESCE("titleAr", '') || ' ' || COALESCE("descriptionAr", ''))
  );

-- 7.3 Kurdish + Chinese use 'simple' dictionary (no native stemmer)
CREATE INDEX CONCURRENTLY IF NOT EXISTS listings_fts_ku_idx
  ON listings USING GIN (
    to_tsvector('simple', COALESCE("titleKu", '') || ' ' || COALESCE("descriptionKu", ''))
  );

-- 7.4 Trigram index for partial/prefix search (e.g. autocomplete)
-- Requires: CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX CONCURRENTLY IF NOT EXISTS listings_title_en_trgm_idx
  ON listings USING GIN ("titleEn" gin_trgm_ops);

CREATE INDEX CONCURRENTLY IF NOT EXISTS listings_title_ku_trgm_idx
  ON listings USING GIN ("titleKu" gin_trgm_ops);

CREATE INDEX CONCURRENTLY IF NOT EXISTS listings_title_ar_trgm_idx
  ON listings USING GIN ("titleAr" gin_trgm_ops);

-- ═══════════════════════════════════════════════════════════════════════════
-- SECTION 8: COMPOSITE INDEXES (optimized for real query patterns)
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── listings ───────────────────────────────────────────────────────────────

-- 8.1 Main browse: status + type + createdAt (replaces separate status/type indexes)
CREATE INDEX CONCURRENTLY IF NOT EXISTS listings_status_type_created_idx
  ON listings (status, type, "createdAt" DESC)
  WHERE "deletedAt" IS NULL;

-- 8.2 User's listings page
CREATE INDEX CONCURRENTLY IF NOT EXISTS listings_user_status_created_idx
  ON listings ("userId", status, "createdAt" DESC)
  WHERE "deletedAt" IS NULL;

-- 8.3 Location-scoped browse
CREATE INDEX CONCURRENTLY IF NOT EXISTS listings_location_status_type_idx
  ON listings ("locationId", status, type)
  WHERE "deletedAt" IS NULL;

-- 8.4 Category browse
CREATE INDEX CONCURRENTLY IF NOT EXISTS listings_category_status_created_idx
  ON listings ("categoryId", status, "createdAt" DESC)
  WHERE "deletedAt" IS NULL;

-- 8.5 Price range (after status filter)
CREATE INDEX CONCURRENTLY IF NOT EXISTS listings_status_price_idx
  ON listings (status, price)
  WHERE "deletedAt" IS NULL;

-- 8.6 Featured homepage — tiny partial index
CREATE INDEX CONCURRENTLY IF NOT EXISTS listings_featured_active_idx
  ON listings ("createdAt" DESC)
  WHERE featured = true
    AND status = 'ACTIVE'
    AND "deletedAt" IS NULL;

-- 8.7 Featured expiry — for cron job that expires featuredUntil
CREATE INDEX CONCURRENTLY IF NOT EXISTS listings_featured_expiry_idx
  ON listings ("featuredUntil")
  WHERE featured = true AND "featuredUntil" IS NOT NULL;

-- ─── listing_vehicle_specs ──────────────────────────────────────────────────

-- 8.8 Primary spec filter (brand + model + year covers 90% of car searches)
CREATE INDEX CONCURRENTLY IF NOT EXISTS lvs_brand_model_year_idx
  ON listing_vehicle_specs ("brandId", "modelId", year);

-- 8.9 Secondary filter (body + fuel + drivetrain for "SUV, Electric, AWD")
CREATE INDEX CONCURRENTLY IF NOT EXISTS lvs_body_fuel_drive_idx
  ON listing_vehicle_specs ("bodyType", "fuelType", drivetrain);

-- 8.10 Condition filter (standalone — "NEW cars" page)
CREATE INDEX CONCURRENTLY IF NOT EXISTS lvs_condition_idx
  ON listing_vehicle_specs (condition)
  WHERE condition IS NOT NULL;

-- 8.11 Mileage range
CREATE INDEX CONCURRENTLY IF NOT EXISTS lvs_mileage_idx
  ON listing_vehicle_specs ("mileageKm")
  WHERE "mileageKm" IS NOT NULL;

-- ─── notifications ──────────────────────────────────────────────────────────

-- 8.12 Unread notifications partial index (much smaller than full-table index)
CREATE INDEX CONCURRENTLY IF NOT EXISTS notifications_user_unread_idx
  ON notifications ("userId", "createdAt" DESC)
  WHERE read = false;

-- ─── refresh_tokens ─────────────────────────────────────────────────────────

-- 8.13 Valid (non-expired) tokens only — cleanup job uses this too
CREATE INDEX CONCURRENTLY IF NOT EXISTS refresh_tokens_user_valid_idx
  ON refresh_tokens ("userId", "expiresAt")
  WHERE "expiresAt" > NOW();

-- ─── dealer_analytics ───────────────────────────────────────────────────────

-- 8.14 Dashboard date range — covering index avoids heap fetch
CREATE INDEX CONCURRENTLY IF NOT EXISTS dealer_analytics_dealer_date_idx
  ON dealer_analytics ("dealerId", date DESC);

-- ─── chats ──────────────────────────────────────────────────────────────────

-- 8.15 Inbox — buyer sees latest chats first
CREATE INDEX CONCURRENTLY IF NOT EXISTS chats_buyer_updated_idx
  ON chats ("buyerId", "updatedAt" DESC);

-- 8.16 Inbox — seller
CREATE INDEX CONCURRENTLY IF NOT EXISTS chats_seller_updated_idx
  ON chats ("sellerId", "updatedAt" DESC);

-- ─── messages ───────────────────────────────────────────────────────────────

-- 8.17 Thread pagination
CREATE INDEX CONCURRENTLY IF NOT EXISTS messages_chat_created_idx
  ON messages ("chatId", "createdAt" DESC);

-- 8.18 Unread messages in a chat (for badge count)
CREATE INDEX CONCURRENTLY IF NOT EXISTS messages_chat_unread_idx
  ON messages ("chatId")
  WHERE "readAt" IS NULL;

-- ─── reports ────────────────────────────────────────────────────────────────

-- 8.19 Admin moderation queue
CREATE INDEX CONCURRENTLY IF NOT EXISTS reports_status_type_created_idx
  ON reports (status, "targetType", "createdAt" DESC);

-- ─── dealer_contact_requests ────────────────────────────────────────────────

-- 8.20 Dealer inbox queue
CREATE INDEX CONCURRENTLY IF NOT EXISTS dcr_dealer_status_created_idx
  ON dealer_contact_requests ("dealerId", status, "createdAt" DESC);

-- ─── users ──────────────────────────────────────────────────────────────────

-- 8.21 Soft-deleted users partial (for GDPR erasure jobs)
CREATE INDEX CONCURRENTLY IF NOT EXISTS users_deleted_idx
  ON users ("deletedAt")
  WHERE "deletedAt" IS NOT NULL;

-- 8.22 Locked accounts (for security scan queries)
CREATE INDEX CONCURRENTLY IF NOT EXISTS users_locked_idx
  ON users ("lockedUntil")
  WHERE "lockedUntil" IS NOT NULL AND banned = false;

-- ─── ads ────────────────────────────────────────────────────────────────────

-- 8.23 Active ads by placement (homepage, sidebar)
CREATE INDEX CONCURRENTLY IF NOT EXISTS ads_placement_active_idx
  ON ads (placement, "startsAt", "endsAt")
  WHERE "isActive" = true;

-- ═══════════════════════════════════════════════════════════════════════════
-- SECTION 9: DEALER STATS UPDATE TRIGGER
-- Keeps denormalized Dealer columns in sync instead of running COUNT()
-- on every dealer profile page load.
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION update_dealer_review_stats()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  UPDATE dealers
  SET
    "totalReviews"  = (SELECT COUNT(*)    FROM dealer_reviews WHERE "dealerId" = COALESCE(NEW."dealerId", OLD."dealerId")),
    "averageRating" = (SELECT COALESCE(ROUND(AVG(rating)::NUMERIC, 2), 0)
                       FROM dealer_reviews
                       WHERE "dealerId" = COALESCE(NEW."dealerId", OLD."dealerId")),
    "updatedAt"     = NOW()
  WHERE id = COALESCE(NEW."dealerId", OLD."dealerId");
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_dealer_review_stats ON dealer_reviews;
CREATE TRIGGER trg_dealer_review_stats
  AFTER INSERT OR UPDATE OR DELETE ON dealer_reviews
  FOR EACH ROW EXECUTE FUNCTION update_dealer_review_stats();

-- ─────────────────────────────────────────────────────────────────────────────
-- Listing view counter — batched update via separate job is preferred,
-- but this trigger keeps activeListings count accurate on status change.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION update_dealer_listing_count()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_dealer_id TEXT;
BEGIN
  -- Resolve dealer from user
  SELECT id INTO v_dealer_id FROM dealers WHERE "userId" = COALESCE(NEW."userId", OLD."userId");
  IF v_dealer_id IS NULL THEN RETURN NULL; END IF;

  UPDATE dealers
  SET
    "totalListings"  = (SELECT COUNT(*) FROM listings WHERE "userId" = COALESCE(NEW."userId", OLD."userId") AND "deletedAt" IS NULL),
    "activeListings" = (SELECT COUNT(*) FROM listings WHERE "userId" = COALESCE(NEW."userId", OLD."userId") AND status = 'ACTIVE' AND "deletedAt" IS NULL),
    "updatedAt"      = NOW()
  WHERE id = v_dealer_id;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_dealer_listing_count ON listings;
CREATE TRIGGER trg_dealer_listing_count
  AFTER INSERT OR UPDATE OF status, "deletedAt" OR DELETE ON listings
  FOR EACH ROW EXECUTE FUNCTION update_dealer_listing_count();

-- ═══════════════════════════════════════════════════════════════════════════
-- SECTION 10: TABLE STATISTICS TARGETS
-- PostgreSQL auto-analyzes, but high-cardinality filter columns benefit
-- from a higher statistics target for better query plans.
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE listings             ALTER COLUMN status       SET STATISTICS 200;
ALTER TABLE listings             ALTER COLUMN type         SET STATISTICS 200;
ALTER TABLE listings             ALTER COLUMN price        SET STATISTICS 300;
ALTER TABLE listing_vehicle_specs ALTER COLUMN "brandId"  SET STATISTICS 300;
ALTER TABLE listing_vehicle_specs ALTER COLUMN "modelId"  SET STATISTICS 300;
ALTER TABLE listing_vehicle_specs ALTER COLUMN year       SET STATISTICS 200;
ALTER TABLE dealer_analytics     ALTER COLUMN date         SET STATISTICS 100;

-- ═══════════════════════════════════════════════════════════════════════════
-- SECTION 11: PARTITIONING PREP (future — when listings > 10M rows)
-- Convert listings to range-partitioned by createdAt year.
-- Documented here so the next migration can reference the plan.
-- ═══════════════════════════════════════════════════════════════════════════

-- When ready, execute in a separate migration:
--
-- ALTER TABLE listings RENAME TO listings_legacy;
-- CREATE TABLE listings (LIKE listings_legacy INCLUDING ALL)
--   PARTITION BY RANGE ("createdAt");
-- CREATE TABLE listings_2024 PARTITION OF listings
--   FOR VALUES FROM ('2024-01-01') TO ('2025-01-01');
-- CREATE TABLE listings_2025 PARTITION OF listings
--   FOR VALUES FROM ('2025-01-01') TO ('2026-01-01');
-- CREATE TABLE listings_2026 PARTITION OF listings
--   FOR VALUES FROM ('2026-01-01') TO ('2027-01-01');
-- INSERT INTO listings SELECT * FROM listings_legacy;
-- DROP TABLE listings_legacy;

-- ═══════════════════════════════════════════════════════════════════════════
-- SECTION 12: CLEANUP OLD / REDUNDANT INDEXES
-- These were created by the earlier perf migration but are now superseded
-- by the composite indexes above (a composite on (A, B) makes (A) alone
-- redundant for queries that also filter on B).
-- ═══════════════════════════════════════════════════════════════════════════

DROP INDEX CONCURRENTLY IF EXISTS "Listing_status_idx";          -- superseded by listings_status_type_created_idx
DROP INDEX CONCURRENTLY IF EXISTS "Listing_type_status_idx";     -- superseded
DROP INDEX CONCURRENTLY IF EXISTS "Listing_userId_idx";          -- superseded by listings_user_status_created_idx
DROP INDEX CONCURRENTLY IF EXISTS "Listing_locationId_idx";      -- superseded by listings_location_status_type_idx
DROP INDEX CONCURRENTLY IF EXISTS "Listing_price_idx";           -- superseded by listings_status_price_idx
DROP INDEX CONCURRENTLY IF EXISTS "Listing_featured_createdAt_idx"; -- superseded by listings_featured_active_idx
DROP INDEX CONCURRENTLY IF EXISTS "listing_status_type_created_idx";  -- old perf migration version
DROP INDEX CONCURRENTLY IF EXISTS "listing_featured_status_created_idx";
DROP INDEX CONCURRENTLY IF EXISTS "listing_user_created_idx";
DROP INDEX CONCURRENTLY IF EXISTS "listing_price_status_idx";
DROP INDEX CONCURRENTLY IF EXISTS "spec_brand_model_idx";        -- superseded by lvs_brand_model_year_idx
DROP INDEX CONCURRENTLY IF EXISTS "spec_year_fuel_idx";          -- superseded by lvs_body_fuel_drive_idx
DROP INDEX CONCURRENTLY IF EXISTS "ListingVehicleSpec_brandId_idx"; -- individual, superseded
DROP INDEX CONCURRENTLY IF EXISTS "ListingVehicleSpec_modelId_idx";
DROP INDEX CONCURRENTLY IF EXISTS "ListingVehicleSpec_fuelType_idx";
DROP INDEX CONCURRENTLY IF EXISTS "ListingVehicleSpec_bodyType_idx";
DROP INDEX CONCURRENTLY IF EXISTS "ListingVehicleSpec_drivetrain_idx";
DROP INDEX CONCURRENTLY IF EXISTS "ListingVehicleSpec_color_idx"; -- low selectivity, not worth it
DROP INDEX CONCURRENTLY IF EXISTS "dealer_analytic_dealer_date_idx"; -- replaced by dealer_analytics_dealer_date_idx
DROP INDEX CONCURRENTLY IF EXISTS "notification_user_unread_idx";    -- replaced by notifications_user_unread_idx
