// apps/worker/src/processors/badge-award.processor.ts
//
// Trust & Safety Prompt 6: nightly UserBadge reconciliation for every
// non-deleted user, following the exact same BullMQ repeatable-job
// structure as fraud-recompute.processor.ts (same 'maintenance' queue —
// per that file's own comment, this is now a fourth @Processor('maintenance')
// class, same established pattern of filtering job.data by job.name).
//
// Scheduled at 06:30 UTC — after BOTH fraud-recompute (05:00) and
// seller-score-recompute (05:30), since TRUSTED_SELLER depends on
// FraudScore.overallRisk and TOP_RATED/FAST_RESPONDER depend on
// SellerScore, both of which must be freshly computed for tonight before
// this job reads them. Also after price-curve-recompute's 06:00 slot, so
// no two nightly jobs share a start time.

import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Job, Queue } from 'bullmq';
import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { BadgeAwardService } from '../modules/badges/badge-award.service';
import { ErrorTrackerService } from '../common/monitoring/error-tracker.service';

const BATCH_SIZE = 500;

@Injectable()
@Processor('maintenance')
export class BadgeAwardProcessor extends WorkerHost implements OnModuleInit {
  private readonly logger = new Logger(BadgeAwardProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly badgeAward: BadgeAwardService,
    @InjectQueue('maintenance') private readonly maintenanceQueue: Queue,
    private readonly errorTracker: ErrorTrackerService,
  ) {
    super();
  }

  async onModuleInit() {
    await this.maintenanceQueue.add(
      'award-badges',
      {},
      {
        jobId: 'badge-award-nightly', // stable id → dedupes across replicas/restarts
        repeat: { pattern: '30 6 * * *' }, // 06:30 UTC — after seller-score's 05:30 and price-curve's 06:00 slots
      },
    );
    this.logger.log('Registered nightly badge-award repeatable job');
  }

  async process(job: Job): Promise<void> {
    if (job.name !== 'award-badges') return;

    this.logger.log('Starting nightly badge reconciliation');
    let cursor: string | undefined;
    let processed = 0;
    let failed = 0;

    // eslint-disable-next-line no-constant-condition
    while (true) {
      const batch = await this.prisma.user.findMany({
        where: { deletedAt: null },
        select: { id: true },
        orderBy: { id: 'asc' },
        take: BATCH_SIZE,
        ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      });

      if (batch.length === 0) break;

      // Sequential, not Promise.all — same connection-pressure reasoning
      // as FraudRecomputeProcessor's identical loop (see that file).
      for (const user of batch) {
        try {
          await this.badgeAward.reconcileBadges(user.id);
          processed++;
        } catch (err) {
          failed++;
          this.logger.warn(`Badge reconciliation failed for user ${user.id}: ${(err as Error).message}`);
        }
      }

      cursor = batch[batch.length - 1].id;
      if (batch.length < BATCH_SIZE) break;
    }

    this.logger.log(`Badge reconciliation complete — ${processed} processed, ${failed} failed`);
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job | undefined, error: Error): void {
    this.errorTracker.capture({
      error,
      context: 'BadgeAwardProcessor',
      jobName: job?.name,
      jobId:   job?.id,
      extra:   { attemptsMade: job?.attemptsMade },
    });
  }
}
