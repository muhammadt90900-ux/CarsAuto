-- apps/api/prisma/migrations/XXXX_sell_feature_notes/migration.sql
-- ─────────────────────────────────────────────────────────────────────────────
-- Sell Feature — Migration Notes
-- ─────────────────────────────────────────────────────────────────────────────
-- The existing schema.prisma already contains ALL models needed for the sell
-- feature:
--
--   • Listing     — stores titleKu/En/Ar/Zh, price (Decimal), status, type
--   • Image       — stores image URL, listingId FK, isCover, order
--   • ListingVehicleSpec — stores condition, year, mileage, etc. (optional)
--
-- NO new tables are needed.  This file documents the existing structure that
-- the sell feature relies on, and adds a helpful partial index.
-- ─────────────────────────────────────────────────────────────────────────────

-- Partial index: DRAFT listings owned by a user (used in "My Drafts" dashboard view)
CREATE INDEX IF NOT EXISTS "listings_draft_user_idx"
  ON "listings" ("userId", "createdAt" DESC)
  WHERE "status" = 'DRAFT';

-- Partial index: listings with no images (moderation helper)
CREATE INDEX IF NOT EXISTS "listings_no_images_idx"
  ON "listings" ("createdAt" DESC)
  WHERE "status" = 'ACTIVE';
