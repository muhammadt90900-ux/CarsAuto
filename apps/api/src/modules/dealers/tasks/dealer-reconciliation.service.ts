// apps/api/src/modules/dealers/tasks/dealer-reconciliation.service.ts
//
// WHY THIS EXISTS
// ────────────────
// dealer.listeners.ts maintains Dealer.totalListings / activeListings via
// increment/decrement on listing.created / listing.sold / listing.deleted
// events. Every handler there is fire-and-forget by design (see the comment
// at the top of that file) — if the DB write fails, the handler only calls
// `this.logger.warn(...)` and swallows the error, because a counter update
// must never fail the original HTTP request that triggered it.
//
// The trade-off is that a failed increment/decrement silently desyncs the
// counter forever. There is no retry, no alert, and no way for the counter
// to self-correct — it just drifts a little further every time it happens.
// Same risk applies to Dealer.averageRating / totalReviews, which
// DealersService.recomputeRating() writes directly (not via the event
// system) but with the same "single write, no reconciliation" exposure.
//
// This service is the fix: it treats Listing/DealerReview rows as the
// source of truth and periodically recomputes the denormalized counters
// from scratch, correcting any drift it finds. It is the drift-*correction*
// mechanism; DealerReconciliationProcessor (nightly, via BullMQ) and the
// admin on-demand endpoint (dealers.controller.ts) are just two different
// triggers for the same logic below.

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { CacheService } from '../../../common/cache/cache.service';

const DEALER_CHUNK_SIZE = 500;

export interface DealerCorrection {
  dealerId: string;
  field: 'totalListings' | 'activeListings' | 'averageRating' | 'totalReviews';
  oldValue: number;
  newValue: number;
}

export interface ReconcileDealerResult {
  dealerId: string;
  corrections: DealerCorrection[];
}

export interface ReconcileAllResult {
  dealersProcessed: number;
  dealersCorrected: number;
  totalCorrections: number;
}

@Injectable()
export class DealerReconciliationService {
  private readonly logger = new Logger(DealerReconciliationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
  ) {}

  // ── Single dealer ────────────────────────────────────────────────────────
  // Used by both the nightly batch job and the admin on-demand endpoint.
  // Recomputes every tracked counter from source-of-truth tables and only
  // issues a write (and a warn-level log) for fields that actually drifted.

  async reconcileDealer(dealerId: string): Promise<ReconcileDealerResult> {
    const dealer = await this.prisma.dealer.findUniqueOrThrow({
      where: { id: dealerId },
      select: {
        id: true,
        userId: true,
        slug: true,
        totalListings: true,
        activeListings: true,
        averageRating: true,
        totalReviews: true,
      },
    });

    // Listings are attributed to a dealer via Listing.userId === Dealer.userId
    // (Listing has no dealerId column — see how listing.created is emitted
    // in listings.service.ts) rather than a direct foreign key.
    const [activeCount, totalCount, reviewAgg] = await Promise.all([
      this.prisma.listing.count({
        where: { userId: dealer.userId, status: 'ACTIVE', deletedAt: null },
      }),
      this.prisma.listing.count({
        where: { userId: dealer.userId },
      }),
      // flagged: false mirrors DealersService.recomputeRating()'s filter —
      // must stay in sync with that method or the nightly job and the
      // inline recompute-on-review-create path will fight each other.
      this.prisma.dealerReview.aggregate({
        where: { dealerId: dealer.id, flagged: false },
        _avg: { rating: true },
        _count: { rating: true },
      }),
    ]);

    const computedAvgRating = Math.round((reviewAgg._avg.rating ?? 0) * 100) / 100;
    const computedTotalReviews = reviewAgg._count.rating;
    const storedAvgRating = Number(dealer.averageRating);

    const corrections: DealerCorrection[] = [];
    const data: Record<string, number> = {};

    if (dealer.totalListings !== totalCount) {
      corrections.push({
        dealerId, field: 'totalListings', oldValue: dealer.totalListings, newValue: totalCount,
      });
      data.totalListings = totalCount;
    }
    if (dealer.activeListings !== activeCount) {
      corrections.push({
        dealerId, field: 'activeListings', oldValue: dealer.activeListings, newValue: activeCount,
      });
      data.activeListings = activeCount;
    }
    if (storedAvgRating !== computedAvgRating) {
      corrections.push({
        dealerId, field: 'averageRating', oldValue: storedAvgRating, newValue: computedAvgRating,
      });
      data.averageRating = computedAvgRating;
    }
    if (dealer.totalReviews !== computedTotalReviews) {
      corrections.push({
        dealerId, field: 'totalReviews', oldValue: dealer.totalReviews, newValue: computedTotalReviews,
      });
      data.totalReviews = computedTotalReviews;
    }

    if (corrections.length === 0) {
      return { dealerId, corrections };
    }

    await this.prisma.dealer.update({ where: { id: dealerId }, data });

    // Drift-detection signal: this is the log line to alert/search on in
    // production (e.g. a log-based metric on "Dealer counter drift
    // corrected"). Every correction is logged individually so counts of
    // drift-by-field are easy to pull out of log aggregation.
    for (const c of corrections) {
      this.logger.warn(
        `Dealer counter drift corrected: dealerId=${c.dealerId} field=${c.field} ` +
        `old=${c.oldValue} new=${c.newValue}`,
      );
    }

    await Promise.all([
      this.cache.del(`dealers:detail:${dealer.slug}`),
      this.cache.del('dealers:list:'),
    ]);

    return { dealerId, corrections };
  }

  // ── All dealers, chunked ────────────────────────────────────────────────
  // Cursor-paginated (not skip/take) so this stays cheap as the dealers
  // table grows — each chunk only asks Postgres for the next 500 rows after
  // the last-seen id, rather than re-scanning and discarding an ever-larger
  // offset.

  async reconcileAll(): Promise<ReconcileAllResult> {
    let cursor: string | undefined;
    let dealersProcessed = 0;
    let dealersCorrected = 0;
    let totalCorrections = 0;

    for (;;) {
      const chunk = await this.prisma.dealer.findMany({
        select: { id: true },
        orderBy: { id: 'asc' },
        take: DEALER_CHUNK_SIZE,
        ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      });

      if (chunk.length === 0) break;

      for (const { id } of chunk) {
        try {
          const result = await this.reconcileDealer(id);
          dealersProcessed += 1;
          if (result.corrections.length > 0) {
            dealersCorrected += 1;
            totalCorrections += result.corrections.length;
          }
        } catch (err) {
          // One dealer's failure (e.g. a row deleted mid-run) must not
          // abort the rest of the batch.
          this.logger.error(
            `Reconciliation failed for dealer ${id}: ${(err as Error).message}`,
          );
        }
      }

      cursor = chunk[chunk.length - 1].id;
      if (chunk.length < DEALER_CHUNK_SIZE) break;
    }

    this.logger.log(
      `Dealer reconciliation complete: ${dealersProcessed} dealer(s) checked, ` +
      `${dealersCorrected} corrected, ${totalCorrections} field(s) fixed`,
    );

    return { dealersProcessed, dealersCorrected, totalCorrections };
  }
}
