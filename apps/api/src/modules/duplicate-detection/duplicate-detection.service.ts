/**
 * apps/api/src/modules/duplicate-detection/duplicate-detection.service.ts
 *
 * Trust & Safety Prompt 3 — three-tier duplicate/fake listing detection,
 * cheapest check first. Triggered by DuplicateDetectionListener on every
 * listing create AND update (see that file, and ListingSavedEvent's doc
 * comment in common/events/listing.events.ts, for why a new event was
 * needed rather than reusing ListingCreatedEvent).
 *
 * ── FLAGGED, NOT WORKED AROUND — please read before relying on Tier 1 ──
 * schema.prisma's ListingVehicleSpec.vin field has a comment: "vin unique
 * constraint added" via a raw-SQL migration. That migration file is
 * gitignored (prisma/migrations/ — same as every other migration in this
 * repo) and wasn't in the uploaded zip, so I could NOT verify its exact
 * scope. Two materially different possibilities:
 *   (a) it's a GLOBAL partial-unique index on vin (any status/any user) —
 *       in which case a cross-user VIN clash can never reach this
 *       service's Tier 1 query at all, because the Prisma
 *       vehicleSpec.create/update call in listings.service.ts would throw
 *       a P2002 unique-constraint error first, before ListingSavedEvent
 *       even fires.
 *   (b) it's scoped some other way (e.g. per-user, so one seller can't
 *       double-list the same VIN, but two different sellers CAN both add
 *       it) — in which case Tier 1 below is exactly what's needed and
 *       works as designed.
 * I implemented Tier 1 as specified (assuming case b, since case a would
 * make Prompt 3's Tier 1 requirement unimplementable as asked). Please
 * check the actual migration SQL for the vin constraint and let me know if
 * it's case (a) — if so, listings.service.ts's create()/update() need a
 * P2002 catch that redirects into this same flag+UNDER_REVIEW path instead
 * of letting a raw constraint-violation error reach the user.
 *
 * ── Other flagged interpretation calls (schema didn't have what I needed) ──
 * - Image has no `createdAt` column (Prompt 1 schema). The doc asks for
 *   Tier 2 to scope "phashes from OTHER users' listings from the last 90
 *   days" — I scope by the OWNING LISTING's createdAt instead, which is
 *   the closest available proxy (images are uploaded at/near listing
 *   creation in this app's flow). If per-image recency (independent of
 *   when its listing was created) turns out to matter, Image needs a
 *   createdAt column added in a follow-up migration.
 * - Tier 2's candidate-set query has no way to pre-filter by Hamming
 *   distance in Postgres without a bit-manipulation extension, so distance
 *   is computed in-process across all candidates returned by the SQL
 *   WHERE clause (capped at TIER2_CANDIDATE_CAP). Fine at today's volume;
 *   flagging as a scaling limit, not a hidden one — worth revisiting with
 *   a `bit_count(hash::bit(64) # other::bit(64))` raw-SQL approach if the
 *   90-day candidate set grows into the tens of thousands.
 */

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { EmbeddingSyncTask } from '../../common/tasks/embedding-sync.task';
import { computeImagePHash, hammingDistanceHex } from './phash.util';
import { SuspiciousActivityService } from '../suspicious-activity/suspicious-activity.service';

// Tier 1 — VIN cross-check
const VIN_CLASH_CONFIDENCE = 95;
const VIN_CLASH_SEVERITY = 90;

// Tier 2 — image pHash
const IMAGE_HASH_LOOKBACK_DAYS = 90;
const IMAGE_HASH_DISTANCE_THRESHOLD = 10; // out of 64 bits — conservative, see phash.util.ts
const IMAGE_REUSE_SEVERITY = 60;
const TIER2_CANDIDATE_CAP = 5_000; // see header comment — in-process Hamming distance scan

// Tier 3 — text embedding near-duplicate
const TEXT_LOOKBACK_DAYS = 30;
const TEXT_PRICE_BAND = 0.15; // ±15%
const TEXT_SIMILARITY_THRESHOLD = 0.92; // cosine similarity, tunable
const TEXT_DUPLICATE_SEVERITY = 50;

// De-dupe window: don't re-create an identical (listing, matchedListing,
// matchType) flag on every subsequent edit of the same listing pair.
const FLAG_DEDUPE_WINDOW_HOURS = 24;

@Injectable()
export class DuplicateDetectionService {
  private readonly logger = new Logger(DuplicateDetectionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly embeddingSync: EmbeddingSyncTask,
    private readonly suspiciousActivity: SuspiciousActivityService,
  ) {}

  /** Entry point — runs all three tiers for one listing. Never throws (caller is a fire-and-forget event listener). */
  async checkListing(listingId: string, userId: string): Promise<void> {
    const listing = await this.prisma.listing.findUnique({
      where: { id: listingId },
      include: { vehicleSpec: true, images: true },
    });
    if (!listing || listing.deletedAt) return;

    await this.checkVinClash(listing, userId);
    await this.checkImageReuse(listing, userId);
    await this.checkTextDuplicate(listing, userId);
  }

  // ── Tier 1: VIN cross-check (cheapest — single indexed lookup) ─────────

  private async checkVinClash(
    listing: { id: string; vehicleSpec: { vin: string | null } | null },
    userId: string,
  ): Promise<void> {
    const vin = listing.vehicleSpec?.vin;
    if (!vin) return;

    try {
      const clash = await this.prisma.listingVehicleSpec.findFirst({
        where: {
          vin,
          listingId: { not: listing.id },
          listing: { status: 'ACTIVE', userId: { not: userId } },
        },
        select: { listingId: true },
      });
      if (!clash) return;

      const alreadyFlagged = await this.recentFlagExists(listing.id, clash.listingId, 'VIN');
      if (alreadyFlagged) return;

      await this.prisma.$transaction([
        this.prisma.duplicateListingFlag.create({
          data: {
            listingId: listing.id,
            matchedListingId: clash.listingId,
            matchType: 'VIN',
            confidence: VIN_CLASH_CONFIDENCE,
          },
        }),
        this.prisma.duplicateListingFlag.create({
          data: {
            listingId: clash.listingId,
            matchedListingId: listing.id,
            matchType: 'VIN',
            confidence: VIN_CLASH_CONFIDENCE,
          },
        }),
        this.prisma.listing.update({
          where: { id: listing.id },
          data: { status: 'UNDER_REVIEW' },
        }),
        this.prisma.listing.update({
          where: { id: clash.listingId },
          data: { status: 'UNDER_REVIEW' },
        }),
        this.prisma.suspiciousActivityEvent.create({
          data: {
            userId,
            eventType: 'VIN_CLASH',
            severity: VIN_CLASH_SEVERITY,
            metadata: { listingId: listing.id, matchedListingId: clash.listingId, vin },
          },
        }),
      ]);

      // ADDED (Trust & Safety Prompt 5): route this already-created event
      // through the shared "alert admins if severe" rule — the event row
      // itself was already created above inside the transaction (kept
      // there for atomicity with the UNDER_REVIEW updates); this call adds
      // no new row, it just checks severity and pushes the Notification.
      await this.suspiciousActivity.notifyAdminsIfSevere('VIN_CLASH', VIN_CLASH_SEVERITY, {
        listingId: listing.id,
        matchedListingId: clash.listingId,
        vin,
      });

      this.logger.warn(`VIN clash: listing ${listing.id} vs ${clash.listingId} (vin=${vin}) — both set UNDER_REVIEW`);
    } catch (err) {
      // Never let a Tier 1 failure block Tiers 2/3, or the caller.
      this.logger.warn(`Tier 1 (VIN) check failed for listing ${listing.id}: ${(err as Error).message}`);
    }
  }

  // ── Tier 2: image perceptual hash ───────────────────────────────────────

  private async checkImageReuse(
    listing: { id: string; images: { id: string; url: string; phash: string | null }[] },
    userId: string,
  ): Promise<void> {
    if (!listing.images.length) return;

    try {
      // Compute + persist phash for any image that doesn't have one yet
      // (first run for this listing, or an image added since the last run).
      for (const image of listing.images) {
        if (image.phash) continue;
        const hash = await this.hashImageUrl(image.url);
        if (!hash) continue;
        await this.prisma.image.update({ where: { id: image.id }, data: { phash: hash } });
        image.phash = hash;
      }

      const cutoff = new Date(Date.now() - IMAGE_HASH_LOOKBACK_DAYS * 24 * 60 * 60 * 1000);
      const candidates = await this.prisma.image.findMany({
        where: {
          phash: { not: null },
          listing: { userId: { not: userId }, createdAt: { gte: cutoff } },
        },
        select: { phash: true, listingId: true },
        take: TIER2_CANDIDATE_CAP,
      });
      if (!candidates.length) return;

      let bestDistance = Infinity;
      let bestMatchListingId: string | null = null;
      for (const image of listing.images) {
        if (!image.phash) continue;
        for (const candidate of candidates) {
          const distance = hammingDistanceHex(image.phash, candidate.phash!);
          if (distance < bestDistance) {
            bestDistance = distance;
            bestMatchListingId = candidate.listingId;
          }
        }
      }

      if (!bestMatchListingId || bestDistance > IMAGE_HASH_DISTANCE_THRESHOLD) return;

      const alreadyFlagged = await this.recentFlagExists(listing.id, bestMatchListingId, 'IMAGE_HASH');
      if (alreadyFlagged) return;

      const confidence = Math.max(
        50,
        Math.round(100 - (bestDistance / IMAGE_HASH_DISTANCE_THRESHOLD) * 50),
      );

      await this.prisma.$transaction([
        this.prisma.duplicateListingFlag.create({
          data: {
            listingId: listing.id,
            matchedListingId: bestMatchListingId,
            matchType: 'IMAGE_HASH',
            confidence,
          },
        }),
        this.prisma.suspiciousActivityEvent.create({
          data: {
            userId,
            eventType: 'IMAGE_REUSE',
            severity: IMAGE_REUSE_SEVERITY,
            metadata: { listingId: listing.id, matchedListingId: bestMatchListingId, distance: bestDistance },
          },
        }),
      ]);

      // ADDED (Trust & Safety Prompt 5) — see VIN_CLASH's identical comment above.
      await this.suspiciousActivity.notifyAdminsIfSevere('IMAGE_REUSE', IMAGE_REUSE_SEVERITY, {
        listingId: listing.id,
        matchedListingId: bestMatchListingId,
        distance: bestDistance,
      });

      this.logger.log(`Image reuse flagged: listing ${listing.id} ~ ${bestMatchListingId} (distance=${bestDistance})`);
    } catch (err) {
      this.logger.warn(`Tier 2 (image) check failed for listing ${listing.id}: ${(err as Error).message}`);
    }
  }

  private async hashImageUrl(url: string): Promise<string | null> {
    try {
      const res = await fetch(url);
      if (!res.ok) return null;
      const buffer = Buffer.from(await res.arrayBuffer());
      return await computeImagePHash(buffer);
    } catch (err) {
      this.logger.warn(`Failed to fetch/hash image ${url}: ${(err as Error).message}`);
      return null;
    }
  }

  // ── Tier 3: text near-duplicate via existing pgvector embedding ────────

  private async checkTextDuplicate(
    listing: {
      id: string;
      userId: string;
      categoryId: string | null;
      price: unknown; // Prisma.Decimal — treated as opaque, converted via Number() below
      currency: string;
    },
    userId: string,
  ): Promise<void> {
    if (!listing.categoryId) return; // doc: scoped to "same categoryId" — no categoryId, no meaningful scope

    try {
      // Ensure this listing has an embedding to compare with. Reuses the
      // existing EmbeddingSyncTask (common/tasks/embedding-sync.task.ts)
      // rather than a second embedding pipeline — its own doc comment says
      // it's meant to be "called inline when a new listing is created" but
      // no call site actually existed anywhere in the codebase before this
      // prompt (grepped to confirm). Calling it here, awaited, both fixes
      // that dormant gap AND guarantees embedding is populated before the
      // cosine-similarity query below runs — otherwise Tier 3 would silently
      // no-op for every brand-new listing until the next 5-minute cron tick.
      await this.embeddingSync.embedListing(listing.id);

      const priceNum = Number(listing.price);
      if (!Number.isFinite(priceNum) || priceNum <= 0) return;
      const lowPrice = priceNum * (1 - TEXT_PRICE_BAND);
      const highPrice = priceNum * (1 + TEXT_PRICE_BAND);
      const cutoff = new Date(Date.now() - TEXT_LOOKBACK_DAYS * 24 * 60 * 60 * 1000);

      const matches = await this.prisma.$queryRaw<{ id: string; similarity: number }[]>`
        SELECT l2.id, 1 - (l1.embedding <=> l2.embedding) AS similarity
        FROM listings l1, listings l2
        WHERE l1.id = ${listing.id}
          AND l2.id != ${listing.id}
          AND l2."userId" != ${userId}
          AND l2."categoryId" = ${listing.categoryId}
          AND l2.currency = ${listing.currency}
          AND l2.price BETWEEN ${lowPrice} AND ${highPrice}
          AND l2."createdAt" >= ${cutoff}
          AND l2."deletedAt" IS NULL
          AND l1.embedding IS NOT NULL
          AND l2.embedding IS NOT NULL
        ORDER BY l1.embedding <=> l2.embedding
        LIMIT 1
      `;

      const best = matches[0];
      if (!best || best.similarity < TEXT_SIMILARITY_THRESHOLD) return;

      const alreadyFlagged = await this.recentFlagExists(listing.id, best.id, 'TEXT_EMBEDDING');
      if (alreadyFlagged) return;

      const confidence = Math.min(99, Math.round(best.similarity * 100));

      await this.prisma.$transaction([
        this.prisma.duplicateListingFlag.create({
          data: {
            listingId: listing.id,
            matchedListingId: best.id,
            matchType: 'TEXT_EMBEDDING',
            confidence,
          },
        }),
        this.prisma.suspiciousActivityEvent.create({
          data: {
            userId,
            eventType: 'TEXT_DUPLICATE',
            severity: TEXT_DUPLICATE_SEVERITY,
            metadata: { listingId: listing.id, matchedListingId: best.id, similarity: best.similarity },
          },
        }),
      ]);

      // ADDED (Trust & Safety Prompt 5) — see VIN_CLASH's identical comment above.
      await this.suspiciousActivity.notifyAdminsIfSevere('TEXT_DUPLICATE', TEXT_DUPLICATE_SEVERITY, {
        listingId: listing.id,
        matchedListingId: best.id,
        similarity: best.similarity,
      });

      this.logger.log(`Text near-duplicate flagged: listing ${listing.id} ~ ${best.id} (similarity=${best.similarity.toFixed(3)})`);
    } catch (err) {
      this.logger.warn(`Tier 3 (text) check failed for listing ${listing.id}: ${(err as Error).message}`);
    }
  }

  // ── Shared helper ────────────────────────────────────────────────────────

  private async recentFlagExists(
    listingId: string,
    matchedListingId: string,
    matchType: 'VIN' | 'IMAGE_HASH' | 'TEXT_EMBEDDING',
  ): Promise<boolean> {
    const since = new Date(Date.now() - FLAG_DEDUPE_WINDOW_HOURS * 60 * 60 * 1000);
    const existing = await this.prisma.duplicateListingFlag.findFirst({
      where: {
        listingId,
        matchedListingId,
        matchType,
        createdAt: { gte: since },
      },
      select: { id: true },
    });
    return !!existing;
  }
}
