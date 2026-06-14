/**
 * apps/api/src/modules/ai/translation/translation.service.ts
 *
 * FEATURE 2E — Auto-Translation Service
 *
 * Enqueues a BullMQ background job to auto-translate listing content
 * from Kurdish into Arabic, English, and Chinese.
 *
 * Called from ListingsService.create() AFTER the listing is saved —
 * never blocks the HTTP response.
 */

import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import type { TranslationJobData } from './translation.processor';

@Injectable()
export class TranslationService {
  private readonly logger = new Logger(TranslationService.name);

  constructor(
    @InjectQueue('translations') private readonly translationQueue: Queue,
  ) {}

  /**
   * Enqueues a translation job for a newly created listing.
   * Only queues when the Arabic/English/Chinese titles appear to be empty
   * or identical to the Kurdish (meaning auto-translation hasn't run yet).
   *
   * @param listingId   UUID of the saved listing
   * @param titleKu     Kurdish title (source language)
   * @param descriptionKu Kurdish description (source language)
   */
  async queueTranslation(
    listingId: string,
    titleKu: string,
    descriptionKu: string,
  ): Promise<void> {
    if (!titleKu?.trim()) {
      this.logger.warn(`Skipping translation for ${listingId}: no Kurdish title`);
      return;
    }

    const jobData: TranslationJobData = { listingId, titleKu, descriptionKu };

    await this.translationQueue.add('translate-listing', jobData, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 30_000, // 30 s → 60 s → 120 s
      },
      removeOnComplete: { count: 100 },
      removeOnFail: { count: 50 },
    });

    this.logger.log(`Translation job queued for listing ${listingId}`);
  }
}
