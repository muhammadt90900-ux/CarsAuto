/**
 * apps/api/src/modules/dealers/tasks/dealer-reconciliation.processor.ts
 *
 * BullMQ worker — nightly self-healing pass over Dealer.totalListings,
 * Dealer.activeListings, Dealer.averageRating, and Dealer.totalReviews.
 *
 * See dealer-reconciliation.service.ts for why this job exists (short version:
 * dealer.listeners.ts updates these counters with fire-and-forget
 * increment/decrement writes that swallow errors, so this job is the only
 * thing that can detect and undo the resulting drift).
 *
 * Only handles the nightly full-table sweep. The admin single-dealer
 * endpoint (dealers.controller.ts) intentionally calls
 * DealerReconciliationService directly instead of going through this queue
 * — reconciling one dealer is a handful of indexed queries, and a support
 * agent wants the corrected values back in the response, not a job id to
 * poll.
 *
 * Job retries: 2 attempts, since a transient DB blip mid-run shouldn't need
 * a full 500-dealer chunk replayed — reconcileDealer() is idempotent per
 * dealer, so a retry is always safe.
 */

import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { DealerReconciliationService } from './dealer-reconciliation.service';

export const DEALER_RECONCILIATION_QUEUE = 'dealer-reconciliation';
export const RECONCILE_ALL_JOB = 'reconcile-all';

@Processor(DEALER_RECONCILIATION_QUEUE)
export class DealerReconciliationProcessor extends WorkerHost {
  private readonly logger = new Logger(DealerReconciliationProcessor.name);

  constructor(private readonly reconciliation: DealerReconciliationService) {
    super();
  }

  async process(job: Job<undefined>): Promise<void> {
    if (job.name !== RECONCILE_ALL_JOB) {
      this.logger.warn(`Unknown job name in dealer-reconciliation queue: ${job.name}`);
      return;
    }

    this.logger.log(`Nightly dealer reconciliation started (attempt ${job.attemptsMade + 1})`);
    const result = await this.reconciliation.reconcileAll();
    this.logger.log(`Nightly dealer reconciliation finished: ${JSON.stringify(result)}`);
  }
}
