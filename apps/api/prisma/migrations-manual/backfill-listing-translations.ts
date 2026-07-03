// apps/api/prisma/migrations-manual/backfill-listing-translations.ts
//
// Phase 2 / Prompt 2.2 — one-time DATA migration (not a schema migration).
//
// Backfills the new `ListingTranslation` table from the 8 legacy flat
// columns on `Listing` (titleKu/titleAr/titleEn/titleZh,
// descriptionKu/descriptionAr/descriptionEn/descriptionZh).
//
// Uses PrismaClient directly (not raw SQL) because each Listing row needs
// to be reshaped into up to 4 ListingTranslation rows — a row-by-row
// transform, not something a single SQL statement expresses cleanly while
// also being safe to re-run.
//
// SAFE TO RE-RUN: uses `skipDuplicates: true` against the
// @@unique([listingId, locale]) constraint, so re-running after a partial
// failure (or after new listings were created in the meantime, before the
// app is cut over to dual-writing into ListingTranslation) will only
// insert the rows that don't exist yet.
//
// Usage:
//   npx ts-node apps/api/prisma/migrations-manual/backfill-listing-translations.ts
//
// Before running against production:
//   1. Run `prisma migrate dev` / `prisma db push` first so the
//      `listing_translations` table actually exists.
//   2. Take a fresh backup (see scripts/backup.sh) — this is additive-only
//      (no UPDATE/DELETE against `listings`), but back up anyway.
//   3. Run against a staging DB first and spot-check counts (see the
//      verification query printed at the end of this script).
//   4. Run during low-traffic hours — this does read-heavy pagination over
//      the full `listings` table; with the batching below it should not
//      hold long locks, but it is extra load on the primary.

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const BATCH_SIZE = 1000;

type LocaleColumn = { locale: string; titleCol: 'titleKu' | 'titleAr' | 'titleEn' | 'titleZh'; descCol: 'descriptionKu' | 'descriptionAr' | 'descriptionEn' | 'descriptionZh' };

const LOCALES: LocaleColumn[] = [
  { locale: 'ku', titleCol: 'titleKu', descCol: 'descriptionKu' },
  { locale: 'ar', titleCol: 'titleAr', descCol: 'descriptionAr' },
  { locale: 'en', titleCol: 'titleEn', descCol: 'descriptionEn' },
  { locale: 'zh', titleCol: 'titleZh', descCol: 'descriptionZh' },
];

async function backfill() {
  let cursor: string | undefined;
  let processedListings = 0;
  let insertedRows = 0;

  console.log(`[backfill-listing-translations] starting, batch size ${BATCH_SIZE}`);

  // Cursor-paginate through Listing by id — avoids OFFSET-based pagination
  // getting slower as we go deeper into a large table.
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const listings = await prisma.listing.findMany({
      take: BATCH_SIZE,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      orderBy: { id: 'asc' },
      select: {
        id: true,
        titleKu: true, titleAr: true, titleEn: true, titleZh: true,
        descriptionKu: true, descriptionAr: true, descriptionEn: true, descriptionZh: true,
      },
    });

    if (listings.length === 0) break;

    const rows: { listingId: string; locale: string; title: string; description: string | null }[] = [];

    for (const listing of listings) {
      for (const { locale, titleCol, descCol } of LOCALES) {
        const title = listing[titleCol];
        // Legacy titleKu/titleAr/titleEn/titleZh are non-nullable in the
        // old schema, but guard anyway in case of dirty data — a translation
        // row with an empty title isn't useful and would just need cleanup
        // later, so skip it rather than insert garbage.
        if (!title || !title.trim()) continue;

        rows.push({
          listingId: listing.id,
          locale,
          title,
          description: listing[descCol] ?? null,
        });
      }
    }

    if (rows.length > 0) {
      const result = await prisma.listingTranslation.createMany({
        data: rows,
        skipDuplicates: true, // safe to re-run
      });
      insertedRows += result.count;
    }

    processedListings += listings.length;
    cursor = listings[listings.length - 1].id;

    console.log(`[backfill-listing-translations] processed ${processedListings} listings, inserted ${insertedRows} translation rows so far`);
  }

  console.log(`[backfill-listing-translations] DONE. ${processedListings} listings processed, ${insertedRows} translation rows inserted.`);

  // ── Verification query ──────────────────────────────────────────────────
  const [listingCount, translationCount, kuCount] = await Promise.all([
    prisma.listing.count(),
    prisma.listingTranslation.count(),
    prisma.listingTranslation.count({ where: { locale: 'ku' } }),
  ]);
  console.log(`[backfill-listing-translations] VERIFY: ${listingCount} listings; ${kuCount} 'ku' translation rows (should be ~= ${listingCount}, since titleKu is non-nullable); ${translationCount} translation rows total (should be <= ${listingCount * 4}).`);
}

backfill()
  .catch((err) => {
    console.error('[backfill-listing-translations] FAILED:', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
