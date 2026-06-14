/**
 * apps/api/src/common/tasks/embedding-sync.task.ts
 *
 * FEATURE 2B — Background Embedding Sync
 *
 * Scheduled task that generates pgvector embeddings for listings
 * that don't have them yet. Runs every 5 minutes, processes up to
 * 20 listings per run to stay within OpenAI rate limits.
 *
 * Also called inline when a new listing is created.
 */

import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { OpenAiService } from '../ai/openai.service';

const BATCH_SIZE = 20;

@Injectable()
export class EmbeddingSyncTask {
  private readonly logger = new Logger(EmbeddingSyncTask.name);
  private isRunning = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly openai: OpenAiService,
  ) {}

  /** Runs every 5 minutes via cron. */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async syncEmbeddings(): Promise<void> {
    if (!this.openai.isEnabled) return;
    if (this.isRunning) return; // prevent overlapping runs

    this.isRunning = true;
    try {
      await this._processBatch();
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Generates and saves an embedding for a single listing immediately.
   * Called after listing creation so new listings are searchable quickly.
   */
  async embedListing(listingId: string): Promise<void> {
    if (!this.openai.isEnabled) return;

    try {
      const listing = await this.prisma.listing.findUnique({
        where: { id: listingId },
        select: { titleEn: true, titleKu: true, titleAr: true, descriptionEn: true },
      });
      if (!listing) return;

      const text = this._buildEmbedText(listing);
      const embedding = await this.openai.embed(text);
      if (!embedding.length) return;

      await this.prisma.$executeRawUnsafe(
        `UPDATE "Listing" SET embedding = $1::vector WHERE id = $2`,
        `[${embedding.join(',')}]`,
        listingId,
      );
    } catch (err) {
      this.logger.warn(`Failed to embed listing ${listingId}: ${(err as Error).message}`);
    }
  }

  private async _processBatch(): Promise<void> {
    // Find listings without embeddings (embedding IS NULL)
    const listings = await this.prisma.$queryRaw<Array<{
      id: string;
      titleEn: string;
      titleKu: string;
      titleAr: string;
      descriptionEn: string | null;
    }>>`
      SELECT id, "titleEn", "titleKu", "titleAr", "descriptionEn"
      FROM "Listing"
      WHERE status = 'ACTIVE' AND embedding IS NULL
      ORDER BY "createdAt" DESC
      LIMIT ${BATCH_SIZE}
    `;

    if (!listings.length) return;

    this.logger.log(`Embedding sync: processing ${listings.length} listings`);

    const texts = listings.map((l) => this._buildEmbedText(l));
    const embeddings = await this.openai.embedBatch(texts);

    let updated = 0;
    for (let i = 0; i < listings.length; i++) {
      const embedding = embeddings[i];
      if (!embedding || !embedding.length) continue;

      try {
        await this.prisma.$executeRawUnsafe(
          `UPDATE "Listing" SET embedding = $1::vector WHERE id = $2`,
          `[${embedding.join(',')}]`,
          listings[i]!.id,
        );
        updated++;
      } catch (err) {
        this.logger.warn(`Failed to save embedding for ${listings[i]!.id}: ${(err as Error).message}`);
      }
    }

    this.logger.log(`Embedding sync: updated ${updated}/${listings.length} listings`);
  }

  private _buildEmbedText(listing: {
    titleEn?: string | null;
    titleKu?: string | null;
    titleAr?: string | null;
    descriptionEn?: string | null;
  }): string {
    return [
      listing.titleEn,
      listing.titleKu,
      listing.titleAr,
      listing.descriptionEn?.slice(0, 500), // truncate long descriptions
    ]
      .filter(Boolean)
      .join(' | ');
  }
}
