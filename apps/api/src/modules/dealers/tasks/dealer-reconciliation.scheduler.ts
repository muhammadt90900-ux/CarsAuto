// apps/api/src/modules/dealers/tasks/dealer-reconciliation.scheduler.ts
//
// Registers the nightly dealer-counter reconciliation as a BullMQ repeatable
// job. Runs on every app boot; BullMQ keys repeatable jobs by their pattern +
// jobId, so re-registering the same { jobId, pattern } on every restart is a
// no-op rather than creating duplicate schedules.

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { DEALER_RECONCILIATION_QUEUE, RECONCILE_ALL_JOB } from './dealer-reconciliation.processor';

const NIGHTLY_JOB_ID = 'dealer-reconciliation-nightly';
// 03:00 server time — off-peak, after the payment retry / token cleanup
// sweeps but before typical Iraq/Kurdistan-region morning traffic.
const NIGHTLY_CRON_PATTERN = '0 3 * * *';

@Injectable()
export class DealerReconciliationScheduler implements OnModuleInit {
  private readonly logger = new Logger(DealerReconciliationScheduler.name);

  constructor(
    @InjectQueue(DEALER_RECONCILIATION_QUEUE) private readonly queue: Queue,
  ) {}

  async onModuleInit() {
    await this.queue.add(RECONCILE_ALL_JOB, undefined, {
      jobId: NIGHTLY_JOB_ID,
      repeat: { pattern: NIGHTLY_CRON_PATTERN },
      attempts: 2,
      backoff: { type: 'exponential', delay: 5 * 60 * 1000 }, // 5 min
      removeOnComplete: 20,
      removeOnFail: 20,
    });
    this.logger.log(
      `Nightly dealer reconciliation scheduled (cron="${NIGHTLY_CRON_PATTERN}")`,
    );
  }
}
