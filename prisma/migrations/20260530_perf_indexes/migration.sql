-- Performance migration: composite and partial indexes
-- for the most common listing + search query patterns

-- ─── Listings: main browsing queries ────────────────────────────────────────

-- (1) Status + type + createdAt — used by findAll with type filter + ordering
CREATE INDEX CONCURRENTLY IF NOT EXISTS "listing_status_type_created_idx"
  ON "Listing" ("status", "type", "createdAt" DESC);

-- (2) Featured (partial) — very small index, used by homepage query
CREATE INDEX CONCURRENTLY IF NOT EXISTS "listing_featured_status_created_idx"
  ON "Listing" ("status", "createdAt" DESC)
  WHERE "featured" = true;

-- (3) User + createdAt — used by myListings
CREATE INDEX CONCURRENTLY IF NOT EXISTS "listing_user_created_idx"
  ON "Listing" ("userId", "createdAt" DESC);

-- (4) Price + status — price range filter
CREATE INDEX CONCURRENTLY IF NOT EXISTS "listing_price_status_idx"
  ON "Listing" ("status", "price");

-- ─── ListingVehicleSpec: filter queries ─────────────────────────────────────

-- (5) Brand + model — most common spec filter combination
CREATE INDEX CONCURRENTLY IF NOT EXISTS "spec_brand_model_idx"
  ON "ListingVehicleSpec" ("brandId", "modelId");

-- (6) Year + fuelType — common combination
CREATE INDEX CONCURRENTLY IF NOT EXISTS "spec_year_fuel_idx"
  ON "ListingVehicleSpec" ("year", "fuelType");

-- ─── Full-text search on listing titles (PostgreSQL GIN) ────────────────────

-- (7) English title full-text
CREATE INDEX CONCURRENTLY IF NOT EXISTS "listing_title_en_gin_idx"
  ON "Listing" USING gin (to_tsvector('english', COALESCE("titleEn", '')));

-- (8) Kurdish/Arabic title (simple dictionary — no stemming)
CREATE INDEX CONCURRENTLY IF NOT EXISTS "listing_title_ku_gin_idx"
  ON "Listing" USING gin (to_tsvector('simple', COALESCE("titleKu", '')));

-- ─── Notifications: unread partial index ────────────────────────────────────

-- (9) Only indexes unread notifications — much smaller than full table index
CREATE INDEX CONCURRENTLY IF NOT EXISTS "notification_user_unread_idx"
  ON "Notification" ("userId", "createdAt" DESC)
  WHERE "read" = false;

-- ─── Dealer analytics: date range ───────────────────────────────────────────

-- (10) Dealer dashboard chart queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS "dealer_analytic_dealer_date_idx"
  ON "DealerAnalytic" ("dealerId", "date" DESC);
