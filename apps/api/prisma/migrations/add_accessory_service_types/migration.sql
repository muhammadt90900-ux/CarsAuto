-- Migration: add_accessory_service_types
-- Adds ACCESSORY and SERVICE to the ListingType enum, and creates
-- the listing_accessory_specs table for accessory/service-specific fields.

-- Step 1: Add new enum values
-- PostgreSQL requires ALTER TYPE ... ADD VALUE (cannot be inside a transaction block for some PG versions)
ALTER TYPE "ListingType" ADD VALUE IF NOT EXISTS 'ACCESSORY';
ALTER TYPE "ListingType" ADD VALUE IF NOT EXISTS 'SERVICE';

-- Step 2: Create listing_accessory_specs table
CREATE TABLE IF NOT EXISTS "listing_accessory_specs" (
  "id"               UUID         NOT NULL DEFAULT gen_random_uuid(),
  "listingId"        UUID         NOT NULL,

  -- Accessory fields
  "brand"            VARCHAR(100),
  "model"            VARCHAR(100),
  "condition"        VARCHAR(30),       -- 'NEW' | 'USED'
  "material"         VARCHAR(100),
  "color"            VARCHAR(50),
  "weight"           DECIMAL(8,2),
  "dimensions"       VARCHAR(100),      -- e.g. "30x20x15 cm"

  -- Service fields
  "serviceType"      VARCHAR(100),      -- repair | maintenance | inspection | towing | other
  "duration"         INTEGER,           -- estimated minutes
  "mobile"           BOOLEAN  NOT NULL DEFAULT false,
  "warranty"         INTEGER,           -- warranty in days
  "certifications"   TEXT[]   NOT NULL DEFAULT '{}',
  "availableDays"    TEXT[]   NOT NULL DEFAULT '{}',  -- mon|tue|wed|thu|fri|sat|sun

  -- Compatibility (both accessory + service)
  "compatibleBrands" TEXT[]   NOT NULL DEFAULT '{}',
  "compatibleModels" TEXT[]   NOT NULL DEFAULT '{}',

  CONSTRAINT "listing_accessory_specs_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "listing_accessory_specs_listingId_key" UNIQUE ("listingId"),
  CONSTRAINT "listing_accessory_specs_listingId_fkey"
    FOREIGN KEY ("listingId")
    REFERENCES listings("id")
    ON DELETE CASCADE
);

-- Step 3: Indexes for common filter patterns
-- Filter by serviceType (e.g. show all "repair" services)
CREATE INDEX IF NOT EXISTS "listing_accessory_specs_serviceType_idx"
  ON "listing_accessory_specs" ("serviceType");

-- Filter by mobile service
CREATE INDEX IF NOT EXISTS "listing_accessory_specs_mobile_idx"
  ON "listing_accessory_specs" ("mobile");

-- Filter by condition (NEW/USED accessories)
CREATE INDEX IF NOT EXISTS "listing_accessory_specs_condition_idx"
  ON "listing_accessory_specs" ("condition");
