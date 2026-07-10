/**
 * apps/worker/src/processors/translation.processor.ts  (copied from apps/api — keep both in sync until apps/api's copy is retired per the F-HIGH-8 migration plan)
 *
 * BullMQ worker — processes listing translation jobs in the background.
 * Runs auto-translation after listing creation so the HTTP response is never blocked.
 *
 * Job retries: 3 attempts with exponential backoff starting at 30 s.
 * On permanent failure: leaves translated fields empty; frontend falls back to Kurdish.
 */

import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../common/prisma/prisma.service';
import { OpenAiService } from '../common/ai/openai.service';
import { ErrorTrackerService } from '../common/monitoring/error-tracker.service';

export interface TranslationJobData {
  listingId: string;
  titleKu: string;
  descriptionKu: string;
}

@Processor('translations')
export class TranslationProcessor extends WorkerHost {
  private readonly logger = new Logger(TranslationProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly openai: OpenAiService,
    private readonly errorTracker: ErrorTrackerService,
  ) {
    super();
  }

  async process(job: Job<TranslationJobData>): Promise<void> {
    const { listingId, titleKu, descriptionKu } = job.data;

    this.logger.log(`Translating listing ${listingId} (attempt ${job.attemptsMade + 1})`);

    const result = await this.openai.translateListing(titleKu, descriptionKu);

    // If translation completely failed, skip update to avoid overwriting with empty strings
    if (!result.titleEn && !result.titleAr && !result.titleZh) {
      this.logger.warn(`Translation returned empty for listing ${listingId} — skipping DB update`);
      return;
    }

    await this.prisma.listing.update({
      where: { id: listingId },
      data: {
        ...(result.titleAr    ? { titleAr: result.titleAr }           : {}),
        ...(result.titleEn    ? { titleEn: result.titleEn }           : {}),
        ...(result.titleZh    ? { titleZh: result.titleZh }           : {}),
        ...(result.descriptionAr ? { descriptionAr: result.descriptionAr } : {}),
        ...(result.descriptionEn ? { descriptionEn: result.descriptionEn } : {}),
        ...(result.descriptionZh ? { descriptionZh: result.descriptionZh } : {}),
      },
    });

    this.logger.log(`Listing ${listingId} translated successfully`);
  }

  // PROMPT 3: fires once BullMQ has given up on this job (after all retry
  // attempts are exhausted — see this file's header, 3 attempts). Job NAME
  // and ID only, never `job.data` (listing title/description text) — see
  // docs/ERROR-TRACKING.md for why job payloads are never forwarded.
  @OnWorkerEvent('failed')
  onFailed(job: Job<TranslationJobData> | undefined, error: Error): void {
    this.errorTracker.capture({
      error,
      context: 'TranslationProcessor',
      jobName: job?.name,
      jobId:   job?.id,
      extra:   { attemptsMade: job?.attemptsMade },
    });
  }
}
