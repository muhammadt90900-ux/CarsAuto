// apps/worker/src/processors/fraud-recompute.processor.ts
//
// Prompt 4: nightly recompute of FraudScore for every non-deleted user,
// following the exact same BullMQ repeatable-job structure as
// ranking-recompute.processor.ts (same 'maintenance' queue — a third
// @Processor('maintenance') class, same established pattern of filtering
// job.data by job.name).
//
// Batches userIds and calls FraudScoringService.scoreAccount() per user
// (each call does its own small set of indexed queries + one upsert — see
// that service for why there's no OpenAI call anywhere in this path).

import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Job, Queue } from 'bullmq';
import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { FraudScoringService } from '../modules/fraud/fraud-scoring.service';
import { ErrorTrackerService } from '../common/monitoring/error-tracker.service';

const BATCH_SIZE = 500;

@Injectable()
@Processor('maintenance')
export class FraudRecomputeProcessor extends WorkerHost implements OnModuleInit {
  private readonly logger = new Logger(FraudRecomputeProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly fraudScoring: FraudScoringService,
    @InjectQueue('maintenance') private readonly maintenanceQueue: Queue,
    private readonly errorTracker: ErrorTrackerService,
  ) {
    super();
  }

  async onModuleInit() {
    await this.maintenanceQueue.add(
      'recompute-fraud-scores',
      {},
      {
        jobId: 'fraud-recompute-nightly', // stable id → dedupes across replicas/restarts
        repeat: { pattern: '0 5 * * *' }, // 05:00 UTC — after ranking-recompute's 04:00 slot
      },
    );
    this.logger.log('Registered nightly fraud-recompute repeatable job');
  }

  async process(job: Job): Promise<void> {
    if (job.name !== 'recompute-fraud-scores') return;

    this.logger.log('Starting nightly fraud-score recompute');
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

      // Sequential, not Promise.all — each scoreAccount() call is itself
      // ~6 queries; running 500 of those concurrently per batch would spike
      // Postgres connections for no real benefit (this job runs once a
      // night, off-hours — throughput isn't the constraint, connection
      // pressure on a shared pool is).
      for (const user of batch) {
        try {
          await this.fraudScoring.scoreAccount(user.id);
          processed++;
        } catch (err) {
          failed++;
          this.logger.warn(`Fraud scoring failed for user ${user.id}: ${(err as Error).message}`);
        }
      }

      cursor = batch[batch.length - 1].id;
      if (batch.length < BATCH_SIZE) break;
    }

    this.logger.log(`Fraud recompute complete — ${processed} scored, ${failed} failed`);
  }

  // PROMPT 3: job.data here is at most a batch of userIds, no PII beyond
  // that — still kept out of the tracked payload on principle, same as
  // every other processor's handler.
  @OnWorkerEvent('failed')
  onFailed(job: Job | undefined, error: Error): void {
    this.errorTracker.capture({
      error,
      context: 'FraudRecomputeProcessor',
      jobName: job?.name,
      jobId:   job?.id,
      extra:   { attemptsMade: job?.attemptsMade },
    });
  }
}
