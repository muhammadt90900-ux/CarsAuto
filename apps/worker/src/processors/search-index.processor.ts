// apps/worker/src/processors/search-index.processor.ts
//
// Search Architecture Phase 1: consumer side of the dual-write pipeline.
// apps/api/src/modules/search-indexing/search-index.listener.ts (reacting
// to domain events) and apps/api/src/modules/admin/admin.service.ts's
// triggerSearchReindex() (bulk backfill) are the two producers; this is
// the only consumer. Same BullMQ Processor/WorkerHost structure and error
// handling as email-notification.processor.ts.
//
// Queue name and job payload shape are shared with the API side via
// apps/api/src/modules/search-indexing/search-index.constants.ts — there
// is no shared package yet, so the literal 'search-index' queue name and
// the { action, listingId } shape are duplicated here. Keep both in sync.

import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Job, UnrecoverableError } from 'bullmq';
import { Logger } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { MeilisearchService, ListingDocument } from '../common/search-index/meilisearch.service';
import { computeRankingScore, CTR_WINDOW_DAYS } from '../common/ranking/ranking-formula';
import { ErrorTrackerService } from '../common/monitoring/error-tracker.service';

// Exported so ranking-recompute.processor.ts (Search Architecture Phase 4)
// can reuse the exact same job shape when it bulk-enqueues re-index jobs
// after recomputing scores — one shared type instead of a second copy
// drifting from this one.
export type SearchIndexAction = 'upsert' | 'delete';

export interface SearchIndexJobData {
  action: SearchIndexAction;
  listingId: string;
}

// Mirrors search.service.ts's SEARCH_SELECT shape (apps/api) — same idea
// (lean select, no description blobs), extended with the fields the
// Meilisearch document needs that SEARCH_SELECT doesn't currently select
// (locationId/country/governorate, dealer verification, brand/model ids).
const INDEX_SELECT = {
  id: true,
  type: true,
  status: true,
  titleKu: true,
  titleAr: true,
  titleEn: true,
  titleZh: true,
  price: true,
  currency: true,
  featured: true,
  featuredUntil: true,
  createdAt: true,
  deletedAt: true,
  userId: true,
  locationId: true,
  location: {
    select: { city: true, governorate: true, country: true, lat: true, lng: true },
  },
  vehicleSpec: {
    select: {
      year: true,
      fuelType: true,
      transmission: true,
      condition: true,
      brand: { select: { id: true, nameEn: true, nameKu: true, nameAr: true } },
      model: { select: { id: true, nameEn: true } },
    },
  },
} as const;

@Processor('search-index')
export class SearchIndexProcessor extends WorkerHost {
  private readonly logger = new Logger(SearchIndexProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly meilisearch: MeilisearchService,
    private readonly errorTracker: ErrorTrackerService,
  ) {
    super();
  }

  async process(job: Job<SearchIndexJobData>): Promise<void> {
    const { action, listingId } = job.data;

    if (action === 'delete') {
      await this.meilisearch.deleteDocument(listingId);
      this.logger.log(`Removed listing ${listingId} from Meilisearch`);
      return;
    }

    const listing = await this.prisma.listing.findUnique({
      where: { id: listingId },
      select: INDEX_SELECT,
    });

    if (!listing) {
      // Listing was hard-deleted (or never existed) between enqueue and
      // processing — nothing to index. Not a transient failure, so don't
      // retry: UnrecoverableError tells BullMQ to fail the job permanently
      // rather than burning through retry attempts (same pattern as
      // email-notification.processor.ts's "user not found" case).
      throw new UnrecoverableError(`Listing ${listingId} not found — skipping index`);
    }

    // Soft-deleted or non-ACTIVE listings should not surface in search —
    // remove rather than upsert a stale/hidden document. Handles the
    // EXPIRED-via-delete() path (which emits 'listing.deleted' with a
    // hard-delete document removal already, but is also defensive here in
    // case a future status transition reaches this branch directly).
    if (listing.deletedAt !== null) {
      await this.meilisearch.deleteDocument(listingId);
      this.logger.log(`Listing ${listingId} is soft-deleted — removed from Meilisearch`);
      return;
    }

    // Best-effort dealer lookup — a listing without a dealer (private
    // seller) is a normal, expected case, not an error.
    const dealer = await this.prisma.dealer.findUnique({
      where: { userId: listing.userId },
      select: { id: true, verifiedAt: true },
    });

    // Search Architecture Phase 4: give a brand-new or just-edited listing
    // an up-to-date rankingScore immediately, rather than leaving it at
    // whatever the last nightly ranking-recompute.processor.ts run set (or
    // the schema default, for a listing that's never been scored). Single-
    // listing CTR lookup here (2 small counts) is fine per-job — it's the
    // *nightly batch* job that needs the aggregate-query optimization, not
    // this one-at-a-time indexing path.
    const since = new Date(Date.now() - CTR_WINDOW_DAYS * 86_400_000);
    const [impressions, clicks] = await Promise.all([
      this.prisma.searchEvent.count({
        where: { resultListingIds: { has: listing.id }, createdAt: { gte: since } },
      }),
      this.prisma.searchClick.count({
        where: { listingId: listing.id, createdAt: { gte: since } },
      }),
    ]);

    const { finalScore } = computeRankingScore({
      createdAt: listing.createdAt,
      featured: listing.featured,
      featuredUntil: listing.featuredUntil,
      dealerVerified: dealer?.verifiedAt != null,
      impressions,
      clicks,
    });

    await this.prisma.listing.update({
      where: { id: listing.id },
      data: { rankingScore: finalScore },
    });

    const doc: ListingDocument = {
      id: listing.id,
      type: listing.type,
      status: listing.status,
      titleKu: listing.titleKu,
      titleAr: listing.titleAr,
      titleEn: listing.titleEn,
      titleZh: listing.titleZh,
      price: Number(listing.price),
      currency: listing.currency,
      brandId: listing.vehicleSpec?.brand?.id ?? null,
      brandNameEn: listing.vehicleSpec?.brand?.nameEn ?? null,
      brandNameKu: listing.vehicleSpec?.brand?.nameKu ?? null,
      brandNameAr: listing.vehicleSpec?.brand?.nameAr ?? null,
      modelId: listing.vehicleSpec?.model?.id ?? null,
      modelNameEn: listing.vehicleSpec?.model?.nameEn ?? null,
      year: listing.vehicleSpec?.year ?? null,
      fuelType: listing.vehicleSpec?.fuelType ?? null,
      transmission: listing.vehicleSpec?.transmission ?? null,
      condition: listing.vehicleSpec?.condition ?? null,
      locationId: listing.locationId,
      city: listing.location?.city ?? null,
      governorate: listing.location?.governorate ?? null,
      country: listing.location?.country ?? null,
      _geo: listing.location
        ? { lat: Number(listing.location.lat), lng: Number(listing.location.lng) }
        : null,
      featured: listing.featured,
      dealerId: dealer?.id ?? null,
      dealerVerified: dealer?.verifiedAt != null,
      createdAt: Math.floor(listing.createdAt.getTime() / 1000),
      deletedAt: null,
      rankingScore: finalScore,
    };

    await this.meilisearch.upsertDocument(doc);
    this.logger.log(`Indexed listing ${listingId} into Meilisearch`);
  }

  // PROMPT 3: job.data is only {action, listingId} — no listing content —
  // but still kept out for consistency with every other processor's handler.
  @OnWorkerEvent('failed')
  onFailed(job: Job<SearchIndexJobData> | undefined, error: Error): void {
    this.errorTracker.capture({
      error,
      context: 'SearchIndexProcessor',
      jobName: job?.name,
      jobId:   job?.id,
      extra:   { attemptsMade: job?.attemptsMade, action: job?.data?.action },
    });
  }
}
