// apps/worker/src/processors/ranking-recompute.processor.ts
//
// Search Architecture Phase 4: nightly recompute of Listing.rankingScore
// for every ACTIVE listing, following the exact same BullMQ repeatable-job
// structure as partition-maintenance.processor.ts (same 'maintenance'
// queue — a second @Processor('maintenance') class is the established
// pattern here; each processor filters job.data by job.name, see that
// file's onModuleInit()/process() for the precedent).
//
// After persisting each batch's new scores to Postgres, enqueues a
// search-index 'upsert' job per listing so Meilisearch's rankingScore
// field (used as a sort tiebreaker — see meilisearch.service.ts's
// ensureListingsIndex()) picks up the new value on next index write,
// rather than drifting from Postgres until some unrelated event happens
// to re-index that listing.

import { Processor, WorkerHost, InjectQueue } from '@nestjs/bullmq';
import { Job, Queue } from 'bullmq';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import {
  computeRankingScore,
  CTR_WINDOW_DAYS,
} from '../common/ranking/ranking-formula';
import { SearchIndexJobData } from './search-index.processor';

const BATCH_SIZE = 500;

interface CtrEntry {
  impressions: number;
  clicks: number;
}

@Injectable()
@Processor('maintenance')
export class RankingRecomputeProcessor extends WorkerHost implements OnModuleInit {
  private readonly logger = new Logger(RankingRecomputeProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue('maintenance') private readonly maintenanceQueue: Queue,
    @InjectQueue('search-index') private readonly searchIndexQueue: Queue<SearchIndexJobData>,
  ) {
    super();
  }

  async onModuleInit() {
    await this.maintenanceQueue.add(
      'recompute-ranking-scores',
      {},
      {
        jobId: 'ranking-recompute-nightly', // stable id → dedupes across replicas/restarts
        repeat: { pattern: '0 4 * * *' }, // 04:00 UTC daily — after the monthly partition job's 03:00 slot
      },
    );
    this.logger.log('Registered nightly ranking-recompute repeatable job');
  }

  async process(job: Job): Promise<void> {
    if (job.name !== 'recompute-ranking-scores') return;

    this.logger.log('Starting nightly ranking-score recompute');
    const ctrMap = await this.computeCtrMap();
    this.logger.log(`CTR map built for ${ctrMap.size} listings (trailing ${CTR_WINDOW_DAYS}d)`);

    let cursor: string | undefined;
    let processed = 0;
    const now = new Date();

    // eslint-disable-next-line no-constant-condition
    while (true) {
      const batch = await this.prisma.listing.findMany({
        where: { status: 'ACTIVE', deletedAt: null },
        select: { id: true, createdAt: true, featured: true, featuredUntil: true, userId: true },
        orderBy: { id: 'asc' },
        take: BATCH_SIZE,
        ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      });

      if (batch.length === 0) break;

      // Dealer-verification lookup for the whole batch in one query rather
      // than N — same reasoning as search-index.processor.ts's per-listing
      // dealer lookup, just batched here since we're already batching.
      const userIds = batch.map((l: { userId: string }) => l.userId);
      const dealers = await this.prisma.dealer.findMany({
        where: { userId: { in: userIds } },
        select: { userId: true, verifiedAt: true },
      });
      const verifiedByUserId = new Map<string, boolean>(
  dealers.map(
    (d: { userId: string; verifiedAt: Date | null }): [string, boolean] => [d.userId, d.verifiedAt != null],
  ),
);
      const scored: { id: string; score: number }[] = batch.map(
  (listing: {
    id: string;
    createdAt: Date;
    featured: boolean;
    featuredUntil: Date | null;
    userId: string;
  }) => {
    const ctr = ctrMap.get(listing.id);
    const { finalScore } = computeRankingScore({
      createdAt: listing.createdAt,
      featured: listing.featured,
      featuredUntil: listing.featuredUntil,
      dealerVerified: verifiedByUserId.get(listing.userId) ?? false,
      impressions: ctr?.impressions ?? 0,
      clicks: ctr?.clicks ?? 0,
      now,
    });
    return { id: listing.id, score: finalScore };
  },
);

      await this.persistBatch(scored);

      await this.searchIndexQueue.addBulk(
        scored.map(({ id }) => ({
          name: 'upsert',
          data: { action: 'upsert', listingId: id } as SearchIndexJobData,
          opts: { attempts: 5, backoff: { type: 'exponential', delay: 2_000 }, removeOnComplete: true, removeOnFail: 1_000 },
        })),
      );

      processed += batch.length;
      cursor = batch[batch.length - 1].id;
      if (batch.length < BATCH_SIZE) break;
    }

    this.logger.log(`Ranking recompute complete — ${processed} listings scored and re-enqueued for indexing`);
  }

  /**
   * One-shot aggregate over the whole trailing window — a raw `unnest()`
   * GROUP BY for impressions (search_events.result_listing_ids is a
   * Postgres array, one row per SEARCH not per impression) and a plain
   * GROUP BY for clicks. Two queries total for the entire nightly batch,
   * regardless of catalog size — the alternative (a per-listing count
   * query inside the batch loop above) would be 2×N queries.
   */
  private async computeCtrMap(): Promise<Map<string, CtrEntry>> {
    const since = new Date(Date.now() - CTR_WINDOW_DAYS * 86_400_000);

    const impressionRows = await this.prisma.$queryRaw<{ listing_id: string; impressions: bigint }[]>`
      SELECT unnest(result_listing_ids) AS listing_id, count(*) AS impressions
      FROM search_events
      WHERE created_at >= ${since}
      GROUP BY listing_id
    `;

    const clickRows = await this.prisma.$queryRaw<{ listing_id: string; clicks: bigint }[]>`
      SELECT listing_id, count(*) AS clicks
      FROM search_clicks
      WHERE created_at >= ${since}
      GROUP BY listing_id
    `;

    const map = new Map<string, CtrEntry>();
    for (const row of impressionRows) {
      map.set(row.listing_id, { impressions: Number(row.impressions), clicks: 0 });
    }
    for (const row of clickRows) {
      const entry = map.get(row.listing_id) ?? { impressions: 0, clicks: 0 };
      entry.clicks = Number(row.clicks);
      map.set(row.listing_id, entry);
    }
    return map;
  }

  /** Single bulk UPDATE via VALUES list — much cheaper than 500 individual UPDATEs per batch. */
  private async persistBatch(scored: { id: string; score: number }[]): Promise<void> {
    if (!scored.length) return;
    const values = scored.map((s) => `('${s.id}'::uuid, ${s.score})`).join(', ');
    await this.prisma.$executeRawUnsafe(`
      UPDATE listings AS l
      SET ranking_score = c.score
      FROM (VALUES ${values}) AS c(id, score)
      WHERE l.id = c.id
    `);
  }
}
