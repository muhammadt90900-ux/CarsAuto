// apps/worker/src/processors/seller-score-recompute.processor.ts
//
// Prompt 5: nightly recompute of SellerScore — INCREMENTAL, not a full
// re-score of every user like fraud-recompute.processor.ts is. Per the
// source prompt's own instruction to scope this to entities with new
// activity: a seller who listed nothing, sent no messages, and got no new
// reports/favorites since their last score has a score that cannot have
// changed, so recomputing it is wasted work (and, unlike FraudScore,
// SellerScoreService's price-competitiveness signal runs one raw SQL
// query per listing — not free to do at full-table scale nightly).
//
// "New activity" = any of: a new/updated ACTIVE listing, a new message
// sent or received, in the last 24h — i.e. anything that could move any
// of the four scored components. Sellers with NO listings and NO recent
// messages are skipped entirely (their score, if any, just goes stale
// until they're active again — same "swept later" reasoning used
// elsewhere in this codebase, e.g. AiChatSession.expiresAt).

import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Job, Queue } from 'bullmq';
import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { SellerScoreRecomputeService } from '../modules/analytics/seller-score-recompute.service';
import { ErrorTrackerService } from '../common/monitoring/error-tracker.service';

const ACTIVITY_WINDOW_HOURS = 24;

@Injectable()
@Processor('maintenance')
export class SellerScoreRecomputeProcessor extends WorkerHost implements OnModuleInit {
  private readonly logger = new Logger(SellerScoreRecomputeProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly recompute: SellerScoreRecomputeService,
    @InjectQueue('maintenance') private readonly maintenanceQueue: Queue,
    private readonly errorTracker: ErrorTrackerService,
  ) {
    super();
  }

  async onModuleInit() {
    await this.maintenanceQueue.add(
      'recompute-seller-scores',
      {},
      {
        jobId: 'seller-score-recompute-nightly',
        repeat: { pattern: '30 5 * * *' }, // 05:30 UTC — after fraud-recompute's 05:00 slot
      },
    );
    this.logger.log('Registered nightly seller-score-recompute repeatable job');
  }

  async process(job: Job): Promise<void> {
    if (job.name !== 'recompute-seller-scores') return;

    const since = new Date(Date.now() - ACTIVITY_WINDOW_HOURS * 3600 * 1000);

    const [activeListers, recentMessagers] = await Promise.all([
      this.prisma.listing.findMany({
        where: { updatedAt: { gte: since }, deletedAt: null },
        select: { userId: true },
        distinct: ['userId'],
      }),
      this.prisma.message.findMany({
        where: { createdAt: { gte: since } },
        select: { senderId: true, chat: { select: { sellerId: true } } },
        distinct: ['senderId'],
      }),
    ]);

    const candidateIds = new Set<string>();
    for (const l of activeListers) candidateIds.add(l.userId);
    for (const m of recentMessagers) {
      candidateIds.add(m.senderId);
      if (m.chat?.sellerId) candidateIds.add(m.chat.sellerId);
    }

    this.logger.log(`Seller-score recompute: ${candidateIds.size} seller(s) with activity in the last ${ACTIVITY_WINDOW_HOURS}h`);

    let processed = 0;
    let failed = 0;
    for (const userId of candidateIds) {
      try {
        await this.recompute.recompute(userId);
        processed++;
      } catch (err) {
        failed++;
        this.logger.warn(`Seller-score recompute failed for user ${userId}: ${(err as Error).message}`);
      }
    }

    this.logger.log(`Seller-score recompute complete — ${processed} scored, ${failed} failed`);
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job | undefined, error: Error): void {
    this.errorTracker.capture({
      error,
      context: 'SellerScoreRecomputeProcessor',
      jobName: job?.name,
      jobId:   job?.id,
      extra:   { attemptsMade: job?.attemptsMade },
    });
  }
}
