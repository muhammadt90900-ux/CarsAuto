/**
 * apps/api/src/modules/ai/translation/translation.processor.ts
 *
 * BullMQ worker — processes listing translation jobs in the background.
 * Runs auto-translation after listing creation so the HTTP response is never blocked.
 *
 * Job retries: 3 attempts with exponential backoff starting at 30 s.
 * On permanent failure: leaves translated fields empty; frontend falls back to Kurdish.
 */

import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { OpenAiService } from '../../../common/ai/openai.service';

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
}
