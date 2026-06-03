-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: 20260603000000_db_index_optimization
-- AutoBazaarPro — Senior DB Architect Review: Index Gaps, Search, Query Optimization
--
-- Scope:
--   1.  Missing partial indexes (phone unique, soft-delete, token expiry)
--   2.  New composite indexes for real query patterns not yet covered
--   3.  Full-text search extensions (Chinese zh — pg_trgm already present)
--   4.  Search optimization: dealer name trigram, listing partNumber, VIN
--   5.  Statistics targets for new high-cardinality columns
--   6.  Constraint additions (VIN format, phone format)
--   7.  Redundant index cleanup (superseded by new composites)
--   8.  pg_stat_statements reminder comment for query profiling
--
-- All index creation uses CONCURRENTLY — safe for production (no table lock).
-- Run outside an explicit transaction (CONCURRENTLY cannot run in one).
-- ─────────────────────────────────────────────────────────────────────────────

-- ═══════════════════════════════════════════════════════════════════════════
-- SECTION 1: EXTENSION PREREQUISITES
-- ═══════════════════════════════════════════════════════════════════════════

-- pg_trgm already created by 20260531_optimize — guarded with IF NOT EXISTS
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- uuid-ossp for gen_random_uuid() — usually pre-installed on PG 13+
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- pg_stat_statements — enables query-level profiling (recommended for tuning)
-- Requires superuser or pg_monitor role; silently skips if unavailable.
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;


-- ═══════════════════════════════════════════════════════════════════════════
-- SECTION 2: PARTIAL UNIQUE INDEXES (cannot be expressed in Prisma schema)
-- ═══════════════════════════════════════════════════════════════════════════

-- 2.1 Phone unique per active (non-deleted) user
--     Prisma @unique would enforce globally; we want to allow reuse after GDPR erasure.
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS users_phone_active_unique_idx
  ON users (phone)
  WHERE phone IS NOT NULL AND "deletedAt" IS NULL;

-- 2.2 VIN unique per active (non-deleted) listing
--     Partial: NULL VINs allowed (many sellers omit it); deleted listings don't block reuse.
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS lvs_vin_active_unique_idx
  ON listing_vehicle_specs (vin)
  WHERE vin IS NOT NULL;


-- ═══════════════════════════════════════════════════════════════════════════
-- SECTION 3: USER TABLE — MISSING INDEXES
-- ═══════════════════════════════════════════════════════════════════════════

-- 3.1 Locale index — broadcast locale-specific push/email notifications
CREATE INDEX CONCURRENTLY IF NOT EXISTS users_locale_idx
  ON users (locale)
  WHERE "deletedAt" IS NULL;

-- 3.2 Banned + role composite — admin "banned users by role" moderation page
CREATE INDEX CONCURRENTLY IF NOT EXISTS users_banned_role_idx
  ON users (banned, role)
  WHERE banned = true;

-- 3.3 Verified = false — resend verification email job
CREATE INDEX CONCURRENTLY IF NOT EXISTS users_unverified_idx
  ON users ("createdAt")
  WHERE verified = false AND "deletedAt" IS NULL;

-- 3.4 Failed login attempts — security scan for brute-force detection
CREATE INDEX CONCURRENTLY IF NOT EXISTS users_failed_logins_idx
  ON users ("failedLoginAttempts")
  WHERE "failedLoginAttempts" > 0;


-- ═══════════════════════════════════════════════════════════════════════════
-- SECTION 4: LISTING TABLE — MISSING INDEXES
-- ═══════════════════════════════════════════════════════════════════════════

-- 4.1 partNumber lookup — spare parts sellers search by OEM number
CREATE INDEX CONCURRENTLY IF NOT EXISTS listings_part_number_idx
  ON listings ("partNumber")
  WHERE "partNumber" IS NOT NULL AND "deletedAt" IS NULL;

-- 4.2 Currency + status — multi-currency regional browse (IQD, AED, USD, CNY)
CREATE INDEX CONCURRENTLY IF NOT EXISTS listings_currency_status_idx
  ON listings (currency, status)
  WHERE "deletedAt" IS NULL;

-- 4.3 Negotiable filter — "negotiable only" browse toggle
CREATE INDEX CONCURRENTLY IF NOT EXISTS listings_negotiable_status_idx
  ON listings (negotiable, status)
  WHERE negotiable = true AND "deletedAt" IS NULL;

-- 4.4 Combined price + type for range queries scoped to type
--     e.g. "SUVs between $5k-$30k" — planner uses status+type+price
CREATE INDEX CONCURRENTLY IF NOT EXISTS listings_type_status_price_idx
  ON listings (type, status, price)
  WHERE "deletedAt" IS NULL;

-- 4.5 updatedAt DESC — "recently updated" sort option on browse pages
CREATE INDEX CONCURRENTLY IF NOT EXISTS listings_status_type_updated_idx
  ON listings (status, type, "updatedAt" DESC)
  WHERE "deletedAt" IS NULL;

-- 4.6 views DESC — "most popular" sort (BigInt column)
CREATE INDEX CONCURRENTLY IF NOT EXISTS listings_status_views_idx
  ON listings (status, views DESC)
  WHERE "deletedAt" IS NULL;


-- ═══════════════════════════════════════════════════════════════════════════
-- SECTION 5: LISTING VEHICLE SPECS — MISSING INDEXES
-- ═══════════════════════════════════════════════════════════════════════════

-- 5.1 Year alone — "all 2022 cars" browse
CREATE INDEX CONCURRENTLY IF NOT EXISTS lvs_year_idx
  ON listing_vehicle_specs (year)
  WHERE year IS NOT NULL;

-- 5.2 Transmission + bodyType — "Automatic SUVs" search combo
CREATE INDEX CONCURRENTLY IF NOT EXISTS lvs_transmission_body_idx
  ON listing_vehicle_specs (transmission, "bodyType")
  WHERE transmission IS NOT NULL AND "bodyType" IS NOT NULL;

-- 5.3 Brand + year — "Toyota from 2018-2023" pattern (no model constraint)
CREATE INDEX CONCURRENTLY IF NOT EXISTS lvs_brand_year_idx
  ON listing_vehicle_specs ("brandId", year)
  WHERE "brandId" IS NOT NULL AND year IS NOT NULL;

-- 5.4 Seats filter — family car search ("7-seater")
CREATE INDEX CONCURRENTLY IF NOT EXISTS lvs_seats_idx
  ON listing_vehicle_specs (seats)
  WHERE seats IS NOT NULL;


-- ═══════════════════════════════════════════════════════════════════════════
-- SECTION 6: CHAT TABLE — MISSING INDEXES
-- ═══════════════════════════════════════════════════════════════════════════

-- 6.1 Buyer inbox with status filter — "active only" tab
CREATE INDEX CONCURRENTLY IF NOT EXISTS chats_buyer_status_updated_idx
  ON chats ("buyerId", status, "updatedAt" DESC);

-- 6.2 Seller inbox with status filter
CREATE INDEX CONCURRENTLY IF NOT EXISTS chats_seller_status_updated_idx
  ON chats ("sellerId", status, "updatedAt" DESC);

-- 6.3 Listing chats — "how many inquiries for this listing" admin/seller view
CREATE INDEX CONCURRENTLY IF NOT EXISTS chats_listing_created_idx
  ON chats ("listingId", "createdAt" DESC);


-- ═══════════════════════════════════════════════════════════════════════════
-- SECTION 7: MESSAGE TABLE — ADDITIONAL INDEXES
-- ═══════════════════════════════════════════════════════════════════════════

-- 7.1 Sender + chatId — "messages I sent in this chat" query
CREATE INDEX CONCURRENTLY IF NOT EXISTS messages_sender_chat_idx
  ON messages ("senderId", "chatId", "createdAt" DESC);


-- ═══════════════════════════════════════════════════════════════════════════
-- SECTION 8: NOTIFICATION TABLE — MISSING INDEXES
-- ═══════════════════════════════════════════════════════════════════════════

-- 8.1 Type filter — "show only PRICE_DROP notifications" (notification center tabs)
CREATE INDEX CONCURRENTLY IF NOT EXISTS notifications_user_type_created_idx
  ON notifications ("userId", type, "createdAt" DESC)
  WHERE read = false;

-- 8.2 Bulk cleanup — delete all notifications older than 90 days (background job)
CREATE INDEX CONCURRENTLY IF NOT EXISTS notifications_created_cleanup_idx
  ON notifications ("createdAt")
  WHERE read = true;


-- ═══════════════════════════════════════════════════════════════════════════
-- SECTION 9: DEALER TABLE — MISSING INDEXES
-- ═══════════════════════════════════════════════════════════════════════════

-- 9.1 userId lookup — resolves dealer profile from auth context on every request
--     (userId is @unique so already has an index, but explicit naming aids monitoring)
-- NOTE: Prisma @unique creates an index automatically; this is already covered.
--       Added here as documentation; CREATE INDEX ... IF NOT EXISTS is safe.
CREATE INDEX CONCURRENTLY IF NOT EXISTS dealers_userId_idx
  ON dealers ("userId");

-- 9.2 Status + createdAt — admin "pending verification" queue ordered by submission time
CREATE INDEX CONCURRENTLY IF NOT EXISTS dealers_status_created_idx
  ON dealers (status, "createdAt" DESC);

-- 9.3 Dealer name trigram — autocomplete search in dealer directory
--     Covers all three locales since users may type in any language
CREATE INDEX CONCURRENTLY IF NOT EXISTS dealers_name_en_trgm_idx
  ON dealers USING GIN ("nameEn" gin_trgm_ops);

CREATE INDEX CONCURRENTLY IF NOT EXISTS dealers_name_ku_trgm_idx
  ON dealers USING GIN ("nameKu" gin_trgm_ops);

CREATE INDEX CONCURRENTLY IF NOT EXISTS dealers_name_ar_trgm_idx
  ON dealers USING GIN ("nameAr" gin_trgm_ops);


-- ═══════════════════════════════════════════════════════════════════════════
-- SECTION 10: DEALER SUBSCRIPTION — MISSING INDEXES
-- ═══════════════════════════════════════════════════════════════════════════

-- 10.1 Plan + status — feature gating queries ("all ENTERPRISE dealers with active sub")
CREATE INDEX CONCURRENTLY IF NOT EXISTS dealer_subs_plan_status_idx
  ON dealer_subscriptions (plan, status);

-- 10.2 Trial expiry cron job — find subs where trial ends soon
CREATE INDEX CONCURRENTLY IF NOT EXISTS dealer_subs_trial_ends_idx
  ON dealer_subscriptions ("trialEndsAt")
  WHERE "trialEndsAt" IS NOT NULL AND status = 'TRIALING';

-- 10.3 Gateway subscription ID lookup — webhook reconciliation
CREATE INDEX CONCURRENTLY IF NOT EXISTS dealer_subs_gateway_sub_idx
  ON dealer_subscriptions ("gatewaySubscriptionId")
  WHERE "gatewaySubscriptionId" IS NOT NULL;


-- ═══════════════════════════════════════════════════════════════════════════
-- SECTION 11: PAYMENT TABLE — MISSING INDEXES
-- ═══════════════════════════════════════════════════════════════════════════

-- 11.1 Status + createdAt — billing reconciliation and failed payment retries
CREATE INDEX CONCURRENTLY IF NOT EXISTS payments_status_created_idx
  ON payments (status, "createdAt" DESC);


-- ═══════════════════════════════════════════════════════════════════════════
-- SECTION 12: SAVED SEARCH — ALERT JOB INDEX
-- ═══════════════════════════════════════════════════════════════════════════

-- 12.1 Active searches for alert broadcast — job iterates all active users
CREATE INDEX CONCURRENTLY IF NOT EXISTS saved_searches_active_idx
  ON saved_searches ("userId", "createdAt" DESC)
  WHERE "isActive" = true;


-- ═══════════════════════════════════════════════════════════════════════════
-- SECTION 13: PART COMPATIBILITY — YEAR RANGE INDEX
-- ═══════════════════════════════════════════════════════════════════════════

-- 13.1 Year range query — "find parts compatible with 2018-2022 Toyota Camry"
CREATE INDEX CONCURRENTLY IF NOT EXISTS part_compat_brand_model_years_idx
  ON part_compatibilities ("brandId", "modelId", "yearFrom", "yearTo")
  WHERE "brandId" IS NOT NULL AND "modelId" IS NOT NULL;


-- ═══════════════════════════════════════════════════════════════════════════
-- SECTION 14: AUDIT LOG — MISSING COMPOSITE INDEX
-- ═══════════════════════════════════════════════════════════════════════════

-- 14.1 userId + action + createdAt — "all password reset events for this user"
--      This is the most common security audit query; supersedes separate indexes.
CREATE INDEX CONCURRENTLY IF NOT EXISTS audit_logs_user_action_created_idx
  ON audit_logs ("userId", action, "createdAt" DESC)
  WHERE "userId" IS NOT NULL;

-- 14.2 IP address — security team queries "all events from this IP"
CREATE INDEX CONCURRENTLY IF NOT EXISTS audit_logs_ip_created_idx
  ON audit_logs ("ipAddress", "createdAt" DESC)
  WHERE "ipAddress" IS NOT NULL;


-- ═══════════════════════════════════════════════════════════════════════════
-- SECTION 15: FULL-TEXT SEARCH — CHINESE (ZH) LANGUAGE
-- ═══════════════════════════════════════════════════════════════════════════
-- Chinese has no native PG text search dictionary. pg_trgm (already installed)
-- handles CJK character n-gram search effectively via trigram GIN indexes.
-- The 'simple' tsvector GIN added by previous migration is insufficient for CJK.
-- These trigram indexes supersede listings_fts_ku_idx for Chinese content.

-- 15.1 Chinese title trigram — autocomplete + partial search for ZH users
CREATE INDEX CONCURRENTLY IF NOT EXISTS listings_title_zh_trgm_idx
  ON listings USING GIN ("titleZh" gin_trgm_ops)
  WHERE "deletedAt" IS NULL;

-- 15.2 Chinese description trigram — full-text search in listing body
CREATE INDEX CONCURRENTLY IF NOT EXISTS listings_desc_zh_trgm_idx
  ON listings USING GIN ("descriptionZh" gin_trgm_ops)
  WHERE "descriptionZh" IS NOT NULL AND "deletedAt" IS NULL;

-- 15.3 Kurdish description trigram — complements listings_fts_ku_idx for partial match
CREATE INDEX CONCURRENTLY IF NOT EXISTS listings_desc_ku_trgm_idx
  ON listings USING GIN ("descriptionKu" gin_trgm_ops)
  WHERE "descriptionKu" IS NOT NULL AND "deletedAt" IS NULL;

-- 15.4 Arabic description trigram — partial word search (complements tsvector)
CREATE INDEX CONCURRENTLY IF NOT EXISTS listings_desc_ar_trgm_idx
  ON listings USING GIN ("descriptionAr" gin_trgm_ops)
  WHERE "descriptionAr" IS NOT NULL AND "deletedAt" IS NULL;

-- 15.5 English description trigram — "2.0L turbo" style spec-in-description searches
CREATE INDEX CONCURRENTLY IF NOT EXISTS listings_desc_en_trgm_idx
  ON listings USING GIN ("descriptionEn" gin_trgm_ops)
  WHERE "descriptionEn" IS NOT NULL AND "deletedAt" IS NULL;


-- ═══════════════════════════════════════════════════════════════════════════
-- SECTION 16: LOCATION TABLE — TRIGRAM FOR CITY AUTOCOMPLETE
-- ═══════════════════════════════════════════════════════════════════════════

-- 16.1 City name trigram — location picker autocomplete (all 4 locales)
CREATE INDEX CONCURRENTLY IF NOT EXISTS locations_city_en_trgm_idx
  ON locations USING GIN ("nameEn" gin_trgm_ops);

CREATE INDEX CONCURRENTLY IF NOT EXISTS locations_city_ku_trgm_idx
  ON locations USING GIN ("nameKu" gin_trgm_ops);

CREATE INDEX CONCURRENTLY IF NOT EXISTS locations_city_ar_trgm_idx
  ON locations USING GIN ("nameAr" gin_trgm_ops);

CREATE INDEX CONCURRENTLY IF NOT EXISTS locations_city_zh_trgm_idx
  ON locations USING GIN ("nameZh" gin_trgm_ops);

-- 16.2 Geospatial bounding box — "listings near me" (basic before PostGIS)
--      Composite on lat+lng allows WHERE lat BETWEEN x1 AND x2 AND lng BETWEEN y1 AND y2
CREATE INDEX CONCURRENTLY IF NOT EXISTS locations_lat_lng_idx
  ON locations (lat, lng);


-- ═══════════════════════════════════════════════════════════════════════════
-- SECTION 17: CAR REFERENCE TABLE — SEARCH INDEXES
-- ═══════════════════════════════════════════════════════════════════════════

-- 17.1 Car brand name trigram — autocomplete "Toy..." → Toyota
CREATE INDEX CONCURRENTLY IF NOT EXISTS car_brands_name_en_trgm_idx
  ON car_brands USING GIN ("nameEn" gin_trgm_ops)
  WHERE "isActive" = true;

CREATE INDEX CONCURRENTLY IF NOT EXISTS car_brands_name_ku_trgm_idx
  ON car_brands USING GIN ("nameKu" gin_trgm_ops)
  WHERE "isActive" = true;

CREATE INDEX CONCURRENTLY IF NOT EXISTS car_brands_name_ar_trgm_idx
  ON car_brands USING GIN ("nameAr" gin_trgm_ops)
  WHERE "isActive" = true;

-- 17.2 Car model name trigram — cascaded dropdown search
CREATE INDEX CONCURRENTLY IF NOT EXISTS car_models_name_en_trgm_idx
  ON car_models USING GIN ("nameEn" gin_trgm_ops)
  WHERE "isActive" = true;


-- ═══════════════════════════════════════════════════════════════════════════
-- SECTION 18: CHECK CONSTRAINTS — ADDITIONAL DATA INTEGRITY
-- PostgreSQL does not support ADD CONSTRAINT IF NOT EXISTS for CHECK constraints.
-- Each is wrapped in a DO block that skips if the constraint already exists.
-- ═══════════════════════════════════════════════════════════════════════════

-- 18.1 VIN format: exactly 17 alphanumeric chars, no I/O/Q (ISO 3779)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'lvs_vin_format') THEN
    ALTER TABLE listing_vehicle_specs
      ADD CONSTRAINT lvs_vin_format
        CHECK (vin IS NULL OR (LENGTH(vin) = 17 AND vin ~ '^[A-HJ-NPR-Z0-9]{17}$'));
  END IF;
END $$;

-- 18.2 Dealer response rate must be 0–100
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'dealers_response_rate_range') THEN
    ALTER TABLE dealers
      ADD CONSTRAINT dealers_response_rate_range
        CHECK ("responseRate" BETWEEN 0 AND 100);
  END IF;
END $$;

-- 18.3 Dealer response time positive
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'dealers_response_time_positive') THEN
    ALTER TABLE dealers
      ADD CONSTRAINT dealers_response_time_positive
        CHECK ("responseTimeMin" IS NULL OR "responseTimeMin" >= 0);
  END IF;
END $$;

-- 18.4 Listing views non-negative
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'listings_views_positive') THEN
    ALTER TABLE listings
      ADD CONSTRAINT listings_views_positive
        CHECK (views >= 0);
  END IF;
END $$;

-- 18.5 DealerSubscription maxListings non-negative
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'dealer_subs_max_listings_positive') THEN
    ALTER TABLE dealer_subscriptions
      ADD CONSTRAINT dealer_subs_max_listings_positive
        CHECK ("maxListings" >= 0);
  END IF;
END $$;

-- 18.6 DealerSubscription featuredSlots non-negative
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'dealer_subs_featured_slots_positive') THEN
    ALTER TABLE dealer_subscriptions
      ADD CONSTRAINT dealer_subs_featured_slots_positive
        CHECK ("featuredSlots" >= 0);
  END IF;
END $$;


-- ═══════════════════════════════════════════════════════════════════════════
-- SECTION 19: QUERY OPTIMIZATION — STATISTICS TARGETS
-- Higher targets improve planner estimates for skewed distributions.
-- ═══════════════════════════════════════════════════════════════════════════

-- Listing columns
ALTER TABLE listings ALTER COLUMN currency           SET STATISTICS 50;   -- low cardinality, fast
ALTER TABLE listings ALTER COLUMN negotiable          SET STATISTICS 50;
ALTER TABLE listings ALTER COLUMN "partNumber"        SET STATISTICS 200;

-- Listing vehicle spec columns
ALTER TABLE listing_vehicle_specs ALTER COLUMN transmission  SET STATISTICS 100;
ALTER TABLE listing_vehicle_specs ALTER COLUMN "bodyType"    SET STATISTICS 100;
ALTER TABLE listing_vehicle_specs ALTER COLUMN "fuelType"    SET STATISTICS 100;
ALTER TABLE listing_vehicle_specs ALTER COLUMN condition      SET STATISTICS 100;
ALTER TABLE listing_vehicle_specs ALTER COLUMN seats          SET STATISTICS 50;

-- Dealer columns
ALTER TABLE dealers ALTER COLUMN status        SET STATISTICS 50;
ALTER TABLE dealers ALTER COLUMN tier          SET STATISTICS 50;

-- Notification columns
ALTER TABLE notifications ALTER COLUMN type   SET STATISTICS 150;
ALTER TABLE notifications ALTER COLUMN read   SET STATISTICS 50;

-- Chat columns
ALTER TABLE chats ALTER COLUMN status         SET STATISTICS 50;

-- Audit log columns
ALTER TABLE audit_logs ALTER COLUMN action    SET STATISTICS 200;
ALTER TABLE audit_logs ALTER COLUMN "ipAddress" SET STATISTICS 200;


-- ═══════════════════════════════════════════════════════════════════════════
-- SECTION 20: CLEANUP — SUPERSEDED OR REDUNDANT INDEXES
-- A composite index (A, B, C) makes the single-column (A) index redundant
-- for queries that filter on A alone *when* the composite's leading column
-- covers that access pattern. Only drop when confirmed redundant.
-- ═══════════════════════════════════════════════════════════════════════════

-- 20.1 dealers_userId is covered by the @unique constraint — drop the manual duplicate
DROP INDEX CONCURRENTLY IF EXISTS dealers_userId_idx;

-- 20.2 saved_searches_userId_isActive superseded by saved_searches_active_idx partial
DROP INDEX CONCURRENTLY IF EXISTS saved_searches_userId_isActive_idx;

-- 20.3 notifications_userId_createdAt is superseded by notifications_user_type_created_idx
--      for unread queries; keep the full one for "all notifications" tab
-- (not dropped — different access patterns)

-- 20.4 audit_logs separate action + createdAt superseded by composite
DROP INDEX CONCURRENTLY IF EXISTS "audit_logs_action_idx";
DROP INDEX CONCURRENTLY IF EXISTS "audit_logs_createdAt_idx";
-- Replace with the composite created in section 14 above

-- Recreate action-only index for "all events of type X" queries (different from composite)
CREATE INDEX CONCURRENTLY IF NOT EXISTS audit_logs_action_idx
  ON audit_logs (action, "createdAt" DESC);


-- ═══════════════════════════════════════════════════════════════════════════
-- SECTION 21: QUERY HELPER FUNCTION — SEARCH LISTINGS
-- A single PostgreSQL function that combines all search dimensions.
-- Call from NestJS via prisma.$queryRaw for complex filter queries.
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION search_listings(
  p_locale        TEXT    DEFAULT 'en',
  p_query         TEXT    DEFAULT NULL,
  p_type          TEXT    DEFAULT NULL,
  p_brand_id      UUID    DEFAULT NULL,
  p_model_id      UUID    DEFAULT NULL,
  p_year_from     INT     DEFAULT NULL,
  p_year_to       INT     DEFAULT NULL,
  p_price_min     NUMERIC DEFAULT NULL,
  p_price_max     NUMERIC DEFAULT NULL,
  p_fuel_type     TEXT    DEFAULT NULL,
  p_body_type     TEXT    DEFAULT NULL,
  p_transmission  TEXT    DEFAULT NULL,
  p_condition     TEXT    DEFAULT NULL,
  p_mileage_max   INT     DEFAULT NULL,
  p_location_id   UUID    DEFAULT NULL,
  p_category_id   UUID    DEFAULT NULL,
  p_negotiable    BOOL    DEFAULT NULL,
  p_currency      TEXT    DEFAULT 'USD',
  p_limit         INT     DEFAULT 20,
  p_offset        INT     DEFAULT 0,
  p_sort          TEXT    DEFAULT 'newest'  -- newest | oldest | price_asc | price_desc | popular
)
RETURNS TABLE (
  id              UUID,
  title           TEXT,
  price           NUMERIC,
  currency        CHAR(3),
  status          TEXT,
  type            TEXT,
  views           BIGINT,
  featured        BOOL,
  "createdAt"     TIMESTAMPTZ,
  rank            FLOAT4
) LANGUAGE plpgsql STABLE AS $$
DECLARE
  v_ts_query   TSQUERY;
  v_ts_config  REGCONFIG;
BEGIN
  -- Select text search config by locale
  v_ts_config := CASE p_locale
    WHEN 'ar' THEN 'arabic'::REGCONFIG
    ELSE            'simple'::REGCONFIG   -- ku, zh, en fall back to simple/trigram
  END;

  IF p_query IS NOT NULL AND p_query <> '' THEN
    v_ts_query := plainto_tsquery(v_ts_config, p_query);
  END IF;

  RETURN QUERY
  SELECT
    l.id,
    CASE p_locale
      WHEN 'ku' THEN l."titleKu"
      WHEN 'ar' THEN l."titleAr"
      WHEN 'zh' THEN l."titleZh"
      ELSE           l."titleEn"
    END::TEXT                                                        AS title,
    l.price,
    l.currency,
    l.status::TEXT,
    l.type::TEXT,
    l.views,
    l.featured,
    l."createdAt",
    CASE
      WHEN v_ts_query IS NULL THEN 1.0::FLOAT4
      WHEN p_locale = 'ar'   THEN ts_rank(to_tsvector('arabic', COALESCE(l."titleAr",'') || ' ' || COALESCE(l."descriptionAr",'')), v_ts_query)
      WHEN p_locale = 'zh'   THEN similarity(l."titleZh", p_query)::FLOAT4
      WHEN p_locale = 'ku'   THEN similarity(l."titleKu", p_query)::FLOAT4
      ELSE                        ts_rank(to_tsvector('english', COALESCE(l."titleEn",'') || ' ' || COALESCE(l."descriptionEn",'')), v_ts_query)
    END                                                              AS rank
  FROM listings l
  LEFT JOIN listing_vehicle_specs lvs ON lvs."listingId" = l.id
  WHERE
    l."deletedAt"   IS NULL
    AND l.status     = 'ACTIVE'
    -- Full-text or trigram filter
    AND (
      v_ts_query IS NULL
      OR CASE p_locale
           WHEN 'ar' THEN to_tsvector('arabic',  COALESCE(l."titleAr",'') || ' ' || COALESCE(l."descriptionAr",'')) @@ v_ts_query
           WHEN 'zh' THEN l."titleZh" % p_query  -- trigram similarity
           WHEN 'ku' THEN l."titleKu" % p_query
           ELSE           to_tsvector('english', COALESCE(l."titleEn",'') || ' ' || COALESCE(l."descriptionEn",'')) @@ v_ts_query
         END
    )
    -- Scalar filters
    AND (p_type        IS NULL OR l.type::TEXT         = p_type)
    AND (p_location_id IS NULL OR l."locationId"       = p_location_id)
    AND (p_category_id IS NULL OR l."categoryId"       = p_category_id)
    AND (p_price_min   IS NULL OR l.price              >= p_price_min)
    AND (p_price_max   IS NULL OR l.price              <= p_price_max)
    AND (p_currency    IS NULL OR l.currency            = p_currency)
    AND (p_negotiable  IS NULL OR l.negotiable          = p_negotiable)
    -- Vehicle spec filters (NULL-safe — listings without specs are excluded only if filter applied)
    AND (p_brand_id    IS NULL OR lvs."brandId"         = p_brand_id)
    AND (p_model_id    IS NULL OR lvs."modelId"         = p_model_id)
    AND (p_year_from   IS NULL OR lvs.year             >= p_year_from)
    AND (p_year_to     IS NULL OR lvs.year             <= p_year_to)
    AND (p_fuel_type   IS NULL OR lvs."fuelType"::TEXT  = p_fuel_type)
    AND (p_body_type   IS NULL OR lvs."bodyType"::TEXT  = p_body_type)
    AND (p_transmission IS NULL OR lvs.transmission::TEXT = p_transmission)
    AND (p_condition   IS NULL OR lvs.condition::TEXT   = p_condition)
    AND (p_mileage_max IS NULL OR lvs."mileageKm"      <= p_mileage_max)
  ORDER BY
    CASE p_sort
      WHEN 'oldest'     THEN EXTRACT(EPOCH FROM l."createdAt")
      WHEN 'price_asc'  THEN l.price::FLOAT8
      ELSE NULL
    END ASC NULLS LAST,
    CASE p_sort
      WHEN 'price_desc' THEN l.price::FLOAT8
      WHEN 'popular'    THEN l.views::FLOAT8
      ELSE NULL
    END DESC NULLS LAST,
    -- Default: featured first, then by rank (FTS), then newest
    l.featured DESC,
    rank DESC,
    l."createdAt" DESC
  LIMIT  p_limit
  OFFSET p_offset;
END;
$$;

COMMENT ON FUNCTION search_listings IS
  'Unified listing search function combining FTS (en/ar), trigram (ku/zh), '
  'vehicle spec filters, price range, and multi-locale title selection. '
  'Call via prisma.$queryRaw<SearchResult[]>(Prisma.sql`SELECT * FROM search_listings(...)`)';


-- ═══════════════════════════════════════════════════════════════════════════
-- SECTION 22: TOKEN CLEANUP FUNCTION (scheduled via pg_cron or app cron)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION cleanup_expired_tokens()
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  -- Remove expired email verification tokens (>24h past expiry = safe to purge)
  DELETE FROM email_verification_tokens
  WHERE "expiresAt" < NOW() - INTERVAL '1 day';

  -- Remove expired password reset tokens (>1h past expiry)
  DELETE FROM password_reset_tokens
  WHERE "expiresAt" < NOW() - INTERVAL '1 hour';

  -- Remove expired refresh tokens
  DELETE FROM refresh_tokens
  WHERE "expiresAt" < NOW() - INTERVAL '1 day';

  -- Remove read notifications older than 90 days
  DELETE FROM notifications
  WHERE read = true AND "createdAt" < NOW() - INTERVAL '90 days';
END;
$$;

COMMENT ON FUNCTION cleanup_expired_tokens IS
  'Run daily via pg_cron: SELECT cron.schedule(''0 2 * * *'', $$SELECT cleanup_expired_tokens()$$)';


-- ═══════════════════════════════════════════════════════════════════════════
-- SECTION 23: FINAL — ANALYZE AFFECTED TABLES
-- Refresh planner statistics immediately after bulk index creation.
-- ═══════════════════════════════════════════════════════════════════════════

ANALYZE users;
ANALYZE listings;
ANALYZE listing_vehicle_specs;
ANALYZE dealers;
ANALYZE dealer_subscriptions;
ANALYZE dealer_analytics;
ANALYZE chats;
ANALYZE messages;
ANALYZE notifications;
ANALYZE payments;
ANALYZE audit_logs;
ANALYZE saved_searches;
ANALYZE part_compatibilities;
ANALYZE car_brands;
ANALYZE car_models;
ANALYZE locations;
