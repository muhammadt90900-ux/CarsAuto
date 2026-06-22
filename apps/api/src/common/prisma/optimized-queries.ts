/**
 * CarsAuto — Optimized Query Patterns
 * ─────────────────────────────────────────────────────────────────────────────
 * Each query is annotated with:
 *   • Which index it hits
 *   • Why it's written this way
 *   • What NOT to do (anti-pattern)
 */

import { raw } from '@prisma/client/runtime/library';
import { ListingStatus, ListingType } from './enums';
import { PrismaService } from './prisma.service';

// BUG #11 FIX: this file previously did `const prisma = new PrismaClient()`
// at module scope, bypassing the app's DI-managed connection pool and
// lifecycle (no $disconnect() on shutdown if ever imported). Every function
// below now takes the injected PrismaService as a parameter instead, the
// same as every other service in the app.

const SAFE_COLS = new Set([
  'titleEn', 'titleAr', 'titleKu',
  'descriptionEn', 'descriptionAr', 'descriptionKu',
]);

function assertSafeCol(col: string): void {
  if (!SAFE_COLS.has(col)) {
    throw new Error(`SQL injection guard: column "${col}" not allowed`);
  }
}

// F10 fix: explicit locale allowlist so the locale → column-name mapping
// can never silently accept an unexpected value even if a future caller
// passes locale from user input without pre-validation.
// (The ternary inside fullTextSearch/autocomplete is safe *today* because
// only three literal outcomes are possible, but an explicit type + guard
// closes the door permanently.)
const SAFE_LOCALES = new Set(['en', 'ar', 'ku'] as const);
type SafeLocale = 'en' | 'ar' | 'ku';

function assertSafeLocale(locale: string): asserts locale is SafeLocale {
  if (!SAFE_LOCALES.has(locale as SafeLocale)) {
    throw new Error(`SQL injection guard: locale "${locale}" not allowed`);
  }
}
// ─────────────────────────────────────────────────────────────────────────────
// 1. LISTING BROWSE — main search page
//    Hits: listings_status_type_created_idx (partial, deletedAt IS NULL)
// ─────────────────────────────────────────────────────────────────────────────

interface BrowseListingsInput {
  type?: ListingType;
  locationId?: string;
  categoryId?: string;
  minPrice?: number;
  maxPrice?: number;
  cursor?: string;       // createdAt ISO string for cursor pagination
  limit?: number;
}

export async function browseListings(
  prisma: PrismaService,
  {
  type,
  locationId,
  categoryId,
  minPrice,
  maxPrice,
  cursor,
  limit = 24,
}: BrowseListingsInput) {
  // GOOD: Build where clause incrementally — Prisma generates a single
  //       WHERE with all conditions. The composite index covers status+type+createdAt.
  // BAD:  Don't fetch all and filter in JS. Don't use skip/offset for pagination
  //       (full table scan for large offsets — use cursor instead).

  const where: any = {
    status: ListingStatus.ACTIVE,
    deletedAt: null,
    ...(type       && { type }),
    ...(locationId && { locationId }),
    ...(categoryId && { categoryId }),
    ...(minPrice !== undefined || maxPrice !== undefined) && {
      price: {
        ...(minPrice !== undefined && { gte: minPrice }),
        ...(maxPrice !== undefined && { lte: maxPrice }),
      },
    },
    ...(cursor && { createdAt: { lt: new Date(cursor) } }),
  };

  const listings = await prisma.listing.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: limit,
    // GOOD: Select only what the card needs — avoid SELECT *
    select: {
      id: true,
      titleKu: true,
      titleAr: true,
      titleEn: true,
      price: true,
      currency: true,
      negotiable: true,
      createdAt: true,
      location: { select: { city: true, nameKu: true, nameAr: true, nameEn: true } },
      // Cover image only — not all images
      images: {
        where: { isCover: true },
        take: 1,
        select: { url: true },
      },
      vehicleSpec: {
        select: {
          year: true,
          mileageKm: true,
          fuelType: true,
          transmission: true,
          bodyType: true,
          brand: { select: { nameEn: true, nameKu: true, nameAr: true } },
          model: { select: { nameEn: true, nameKu: true, nameAr: true } },
        },
      },
    },
  });

  const nextCursor =
    listings.length === limit
      ? listings[listings.length - 1]!.createdAt.toISOString()
      : null;

  return { listings, nextCursor };
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. VEHICLE SPEC FILTER — car search with make/model/year/fuel
//    Hits: lvs_brand_model_year_idx, lvs_body_fuel_drive_idx
//    IMPORTANT: Filter through ListingVehicleSpec JOIN, not Listing directly.
// ─────────────────────────────────────────────────────────────────────────────

interface CarFilterInput {
  brandId?: string;
  modelId?: string;
  yearMin?: number;
  yearMax?: number;
  fuelType?: string;
  bodyType?: string;
  drivetrain?: string;
  mileageMax?: number;
  condition?: string;
  cursor?: string;
  limit?: number;
}

export async function searchCars(
  prisma: PrismaService,
  {
  brandId,
  modelId,
  yearMin,
  yearMax,
  fuelType,
  bodyType,
  drivetrain,
  mileageMax,
  condition,
  cursor,
  limit = 24,
}: CarFilterInput) {
  // GOOD: Filter on vehicleSpec using a nested where — Prisma generates an
  //       EXISTS subquery that uses the spec indexes efficiently.
  // BAD:  Don't fetch listings and then filter specs in JS.

  const specWhere: any = {
    ...(brandId   && { brandId }),
    ...(modelId   && { modelId }),
    ...(yearMin !== undefined || yearMax !== undefined) && {
      year: {
        ...(yearMin !== undefined && { gte: yearMin }),
        ...(yearMax !== undefined && { lte: yearMax }),
      },
    },
    ...(fuelType   && { fuelType:   fuelType   as any }),
    ...(bodyType   && { bodyType:   bodyType   as any }),
    ...(drivetrain && { drivetrain: drivetrain as any }),
    ...(mileageMax !== undefined && { mileageKm: { lte: mileageMax } }),
    ...(condition  && { condition:  condition  as any }),
  };

  return prisma.listing.findMany({
    where: {
      status: ListingStatus.ACTIVE,
      type: ListingType.CAR,
      deletedAt: null,
      vehicleSpec: specWhere,
      ...(cursor && { createdAt: { lt: new Date(cursor) } }),
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
    select: {
      id: true,
      titleKu: true, titleAr: true, titleEn: true,
      price: true, currency: true, negotiable: true,
      createdAt: true,
      images: { where: { isCover: true }, take: 1, select: { url: true } },
      location: { select: { city: true, nameKu: true, nameAr: true, nameEn: true } },
      vehicleSpec: {
        select: {
          year: true, mileageKm: true, fuelType: true,
          transmission: true, bodyType: true, condition: true,
          brand: { select: { nameEn: true, nameKu: true, nameAr: true, logoUrl: true } },
          model: { select: { nameEn: true, nameKu: true, nameAr: true } },
        },
      },
    },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. FULL-TEXT SEARCH
//    Hits: GIN tsvector indexes (listings_fts_en_idx / listings_fts_ku_idx)
//    Uses raw SQL for full-text — Prisma's fullTextSearch is PostgreSQL-native.
// ─────────────────────────────────────────────────────────────────────────────

export async function fullTextSearch(prisma: PrismaService, query: string, locale: string, limit = 20) {
  assertSafeLocale(locale);  // F10: runtime guard — narrows to SafeLocale
  // GOOD: Use plainto_tsquery (safe, no syntax errors from user input).
  //       Use websearch_to_tsquery for Google-style queries.
  // BAD:  Don't use LIKE '%query%' — it can't use GIN indexes.
  //       Don't use ILIKE for anything beyond small tables.

  const config = locale === 'en' ? 'english' : locale === 'ar' ? 'arabic' : 'simple';
  const titleCol = locale === 'en' ? '"titleEn"' : locale === 'ar' ? '"titleAr"' : '"titleKu"';
  const descCol  = locale === 'en' ? '"descriptionEn"' : locale === 'ar' ? '"descriptionAr"' : '"descriptionKu"';

  // ts_rank_cd gives better ranking for compound documents
  const results = await prisma.$queryRaw<Array<{ id: string; rank: number }>>`
    SELECT id, ts_rank_cd(
      to_tsvector(${config}, COALESCE(${raw(titleCol)}, '') || ' ' || COALESCE(${raw(descCol)}, '')),
      plainto_tsquery(${config}, ${query})
    ) AS rank
    FROM listings
    WHERE
      "deletedAt" IS NULL
      AND status = 'ACTIVE'
      AND to_tsvector(${config}, COALESCE(${raw(titleCol)}, '') || ' ' || COALESCE(${raw(descCol)}, ''))
          @@ plainto_tsquery(${config}, ${query})
    ORDER BY rank DESC
    LIMIT ${limit}
  `;

  if (results.length === 0) return [];

  const ids = results.map((r: { id: string; rank: number }) => r.id);
  const rankMap = new Map(results.map((r: { id: string; rank: number }) => [r.id, r.rank]));

  const listings = await prisma.listing.findMany({
    where: { id: { in: ids } },
    select: {
      id: true,
      titleKu: true, titleAr: true, titleEn: true,
      price: true, currency: true,
      images: { where: { isCover: true }, take: 1, select: { url: true } },
    },
  });

  // Restore rank order
  return listings.sort((a: { id: string }, b: { id: string }) => ((rankMap.get(b.id) ?? 0) as number) - ((rankMap.get(a.id) ?? 0) as number));
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. AUTOCOMPLETE — trigram search for partial title matches
//    Hits: listings_title_en_trgm_idx (GIN pg_trgm)
// ─────────────────────────────────────────────────────────────────────────────

export async function autocomplete(prisma: PrismaService, partial: string, locale: string, limit = 8) {
  assertSafeLocale(locale);  // F10: runtime guard — narrows to SafeLocale
  // GOOD: pg_trgm similarity search — fast for 3+ character inputs.
  // BAD:  Don't use LIKE '%partial%' on large tables without pg_trgm index.

  const col = locale === 'en' ? 'titleEn' : locale === 'ar' ? 'titleAr' : 'titleKu';

  return prisma.$queryRaw<Array<{ id: string; title: string; similarity: number }>>`
    SELECT id, ${raw(`"${col}"`)} AS title,
           similarity(${raw(`"${col}"`)}, ${partial}) AS similarity
    FROM listings
    WHERE
      "deletedAt" IS NULL
      AND status = 'ACTIVE'
      AND ${raw(`"${col}"`)} % ${partial}
    ORDER BY similarity DESC, "createdAt" DESC
    LIMIT ${limit}
  `;
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. LISTING DETAIL — single listing with all relations
//    Hits: PK lookup (ultra-fast), then FK indexes for includes
// ─────────────────────────────────────────────────────────────────────────────

export async function getListingDetail(prisma: PrismaService, id: string) {
  // GOOD: Fetch all related data in ONE query (Prisma batches selects).
  // BAD:  Don't make N separate queries for images, spec, location, etc.

  const listing = await prisma.listing.findFirst({
    where: { id, deletedAt: null, status: { not: ListingStatus.REJECTED } },
    include: {
      images: { orderBy: { order: 'asc' } },
      location: true,
      category: true,
      vehicleSpec: {
        include: {
          brand: true,
          model: true,
          trim: true,
        },
      },
      user: {
        select: {
          id: true, name: true, avatar: true, createdAt: true,
          dealer: {
            select: {
              id: true, slug: true, nameEn: true, nameKu: true, nameAr: true,
              logoUrl: true, tier: true, status: true,
              averageRating: true, totalReviews: true,
              phone: true, whatsapp: true,
            },
          },
        },
      },
    },
  });

  if (!listing) return null;

  // Increment view counter — fire and forget (don't await)
  // GOOD: Use $executeRaw to avoid a SELECT + UPDATE round-trip.
  // BAD:  Don't update views synchronously in the request path for high-traffic listings.
  prisma.$executeRaw`
    UPDATE listings SET views = views + 1 WHERE id = ${id}
  `.catch(() => {/* silent — view count is non-critical */});

  return listing;
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. USER INBOX — chats with last message
//    Hits: chats_buyer_updated_idx / chats_seller_updated_idx
// ─────────────────────────────────────────────────────────────────────────────

export async function getUserInbox(prisma: PrismaService, userId: string, role: 'buyer' | 'seller') {
  // GOOD: Fetch chats sorted by updatedAt — the updatedAt is bumped by a trigger
  //       whenever a new message arrives, so this is the correct sort column.
  // BAD:  Don't load all messages and sort by message.createdAt in JS.

  const roleFilter = role === 'buyer' ? { buyerId: userId } : { sellerId: userId };

  return prisma.chat.findMany({
    where: { ...roleFilter, status: 'active' },
    orderBy: { updatedAt: 'desc' },
    take: 50,
    select: {
      id: true,
      updatedAt: true,
      listing: {
        select: {
          id: true,
          titleEn: true, titleKu: true, titleAr: true,
          images: { where: { isCover: true }, take: 1, select: { url: true } },
        },
      },
      buyer:  { select: { id: true, name: true, avatar: true } },
      seller: { select: { id: true, name: true, avatar: true } },
      // Last message only
      messages: { orderBy: { createdAt: 'desc' }, take: 1,
                  select: { content: true, type: true, createdAt: true, senderId: true, readAt: true } },
    },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// 7. DEALER DASHBOARD — analytics for date range
//    Hits: dealer_analytics_dealer_date_idx (covering)
// ─────────────────────────────────────────────────────────────────────────────

export async function getDealerAnalytics(prisma: PrismaService, dealerId: string, days = 30) {
  const from = new Date();
  from.setDate(from.getDate() - days);

  // GOOD: Use raw aggregate for SUM/AVG across a date range — avoids
  //       fetching all rows into JS for aggregation.
  // BAD:  Don't load 30 rows and sum in JS — DB is faster and the
  //       covering index makes this a heap-free index scan.

  const [totals, daily] = await Promise.all([
    // Aggregate totals for the period
    prisma.$queryRaw<Array<{
      profileViews: bigint; listingViews: bigint; contactClicks: bigint;
      whatsappClicks: bigint; phoneClicks: bigint; newLeads: bigint;
    }>>`
      SELECT
        SUM("profileViews")   AS "profileViews",
        SUM("listingViews")   AS "listingViews",
        SUM("contactClicks")  AS "contactClicks",
        SUM("whatsappClicks") AS "whatsappClicks",
        SUM("phoneClicks")    AS "phoneClicks",
        SUM("newLeads")       AS "newLeads"
      FROM dealer_analytics
      WHERE "dealerId" = ${dealerId}::uuid
        AND date >= ${from}::date
    `,
    // Daily breakdown for chart
    prisma.dealerAnalytic.findMany({
      where: { dealerId, date: { gte: from } },
      orderBy: { date: 'asc' },
      select: {
        date: true,
        profileViews: true,
        listingViews: true,
        contactClicks: true,
        newLeads: true,
      },
    }),
  ]);

  return { totals: totals[0], daily };
}

// ─────────────────────────────────────────────────────────────────────────────
// 8. UNREAD NOTIFICATION COUNT — uses partial index
//    Hits: notifications_user_unread_idx (partial WHERE read = false)
// ─────────────────────────────────────────────────────────────────────────────

export async function getUnreadNotificationCount(prisma: PrismaService, userId: string): Promise<number> {
  // GOOD: count() on the partial index — extremely fast.
  // BAD:  Don't findMany() all notifications and check read === false in JS.

  return prisma.notification.count({
    where: { userId, read: false },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// 9. FEATURED LISTINGS — homepage
//    Hits: listings_featured_active_idx (tiny partial index)
// ─────────────────────────────────────────────────────────────────────────────

export async function getFeaturedListings(prisma: PrismaService, limit = 8) {
  return prisma.listing.findMany({
    where: {
      featured: true,
      status: ListingStatus.ACTIVE,
      deletedAt: null,
      OR: [
        { featuredUntil: null },
        { featuredUntil: { gte: new Date() } },
      ],
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
    select: {
      id: true,
      titleKu: true, titleAr: true, titleEn: true,
      price: true, currency: true,
      images: { where: { isCover: true }, take: 1, select: { url: true } },
      vehicleSpec: {
        select: {
          year: true, mileageKm: true,
          brand: { select: { nameEn: true, nameKu: true, nameAr: true } },
          model: { select: { nameEn: true, nameKu: true, nameAr: true } },
        },
      },
    },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// 10. MAKE/MODEL DROPDOWN — reference data
//     GOOD: Cache this at application layer (Redis / in-memory).
//     These tables rarely change — don't hit DB on every request.
// ─────────────────────────────────────────────────────────────────────────────

export async function getActiveBrandsWithModels(prisma: PrismaService) {
  // Hits: car_brands isActive+slug index → car_models brandId+isActive index
  return prisma.carBrand.findMany({
    where: { isActive: true },
    orderBy: { nameEn: 'asc' },
    select: {
      id: true,
      slug: true,
      nameEn: true, nameKu: true, nameAr: true,
      logoUrl: true,
      models: {
        where: { isActive: true },
        orderBy: { nameEn: 'asc' },
        select: { id: true, slug: true, nameEn: true, nameKu: true, nameAr: true },
      },
    },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// 11. SAVED SEARCH ALERT JOB — background worker
//     Hits: saved_searches userId+isActive index
// ─────────────────────────────────────────────────────────────────────────────

export async function getActiveSavedSearches(prisma: PrismaService) {
  // GOOD: Process in batches of 100 — don't load all saved searches into memory.
  // BAD:  Don't findMany() without take — could be millions of rows.

  const BATCH_SIZE = 100;
  let cursor: string | undefined;
  const results = [];

  while (true) {
    const batch = await prisma.savedSearch.findMany({
      where: { isActive: true, ...(cursor && { id: { gt: cursor } }) },
      orderBy: { id: 'asc' },
      take: BATCH_SIZE,
      select: { id: true, userId: true, filters: true },
    });

    results.push(...batch);
    if (batch.length < BATCH_SIZE) break;
    cursor = batch[batch.length - 1]!.id;
  }

  return results;
}

// ─────────────────────────────────────────────────────────────────────────────
// 12. REFRESH TOKEN VALIDATION
//     Hits: tokenHash unique index (single row lookup)
// ─────────────────────────────────────────────────────────────────────────────

export async function validateRefreshToken(prisma: PrismaService, tokenHash: string) {
  // GOOD: Single unique index lookup — O(log n).
  const token = await prisma.refreshToken.findUnique({
    where: { tokenHash },
    select: { userId: true, expiresAt: true, id: true },
  });

  if (!token) return null;
  if (token.expiresAt < new Date()) {
    // Clean up expired token
    await prisma.refreshToken.delete({ where: { tokenHash } });
    return null;
  }

  return token;
}

// ─────────────────────────────────────────────────────────────────────────────
// 13. ADMIN REPORT QUEUE — moderation
//     Hits: reports_status_type_created_idx
// ─────────────────────────────────────────────────────────────────────────────

export async function getPendingReports(prisma: PrismaService, targetType?: string, limit = 50) {
  return prisma.report.findMany({
    where: {
      status: 'pending',
      ...(targetType && { targetType }),
    },
    orderBy: { createdAt: 'asc' }, // oldest first
    take: limit,
    include: {
      reporter: { select: { id: true, name: true, email: true } },
    },
  });
}
