/**
 * apps/api/src/modules/analytics/seller-score.service.ts
 *
 * Prompt 5 — Seller Behavior Score. Pure SQL/Prisma aggregation, NO LLM
 * call anywhere in this file (the narrative layer is a separate service —
 * seller-score-narrative.service.ts — that consumes this one's output).
 *
 * Four components, weights proposed below (not yet "approved" — flagging
 * per the source prompt's own instruction to sanity-check the scoring
 * logic before wiring the narrative layer):
 *   - avgResponseTime   25%  (faster replies → better buyer experience)
 *   - listingQuality    30%  (photo count, 360 set, description length)
 *   - priceCompetitive  25%  (vs AiService.suggestPrice for that vehicle)
 *   - reportRate        20%  (inverted — fewer reports on their listings → better)
 *
 * These weights are a starting proposal, same as FraudScoringService's —
 * revisit once there's real outcome data (e.g. does a low seller score
 * actually correlate with slower sales / more disputes?) to fit against.
 */

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AiService } from '../ai/ai.service';

export interface SellerScoreComponents {
  avgResponseMinutes: number | null;
  responseTimeScore: number; // 0-100
  listingQualityScore: number; // 0-100
  priceCompetitivenessScore: number; // 0-100
  reportRateScore: number; // 0-100 (100 = worst)
  overallScore: number; // 0-100
}

const RESPONSE_WEIGHT = 0.25;
const QUALITY_WEIGHT = 0.30;
const PRICE_WEIGHT = 0.25;
const REPORT_WEIGHT = 0.20; // inverted in the final combine step

const RESPONSE_LOOKBACK_DAYS = 90;
const GOOD_RESPONSE_MINUTES = 15; // <= this → responseTimeScore 100
const BAD_RESPONSE_MINUTES = 24 * 60; // >= this (24h) → responseTimeScore 0
const FULL_PHOTO_COUNT = 8; // 8+ photos → full photo-quality credit
const FULL_DESCRIPTION_CHARS = 300; // 300+ chars → full description credit

@Injectable()
export class SellerScoreService {
  private readonly logger = new Logger(SellerScoreService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly aiService: AiService,
  ) {}

  async computeComponents(userId: string): Promise<SellerScoreComponents> {
    const [avgResponseMinutes, listingQualityScore, priceCompetitivenessScore, reportRateScore] =
      await Promise.all([
        this.computeAvgResponseMinutes(userId),
        this.computeListingQualityScore(userId),
        this.computePriceCompetitivenessScore(userId),
        this.computeReportRateScore(userId),
      ]);

    const responseTimeScore = this.responseMinutesToScore(avgResponseMinutes);

    const overallScore = Math.round(
      responseTimeScore * RESPONSE_WEIGHT +
        listingQualityScore * QUALITY_WEIGHT +
        priceCompetitivenessScore * PRICE_WEIGHT +
        (100 - reportRateScore) * REPORT_WEIGHT,
    );

    return {
      avgResponseMinutes,
      responseTimeScore,
      listingQualityScore,
      priceCompetitivenessScore,
      reportRateScore,
      overallScore: Math.max(0, Math.min(100, overallScore)),
    };
  }

  /**
   * Average minutes between a buyer's first message in a chat and this
   * seller's first reply after it, across chats active in the last 90
   * days. Raw SQL — DISTINCT ON + a self-join is much cheaper here than
   * pulling every message row into Node and walking it.
   */
  private async computeAvgResponseMinutes(userId: string): Promise<number | null> {
    try {
      const rows = await this.prisma.db('read').$queryRaw<Array<{ avg_minutes: number | null; n: bigint }>>`
        WITH seller_chats AS (
          SELECT id FROM chats
          WHERE "sellerId" = ${userId}::uuid
            AND "updatedAt" >= now() - (${RESPONSE_LOOKBACK_DAYS} * interval '1 day')
        ),
        first_buyer_msg AS (
          SELECT DISTINCT ON (m."chatId") m."chatId", m."createdAt" AS buyer_at
          FROM messages m
          JOIN seller_chats sc ON sc.id = m."chatId"
          WHERE m."senderId" != ${userId}::uuid
          ORDER BY m."chatId", m."createdAt" ASC
        ),
        first_seller_reply AS (
          SELECT DISTINCT ON (m."chatId") m."chatId", m."createdAt" AS seller_at
          FROM messages m
          JOIN first_buyer_msg fbm ON fbm."chatId" = m."chatId"
          WHERE m."senderId" = ${userId}::uuid AND m."createdAt" > fbm.buyer_at
          ORDER BY m."chatId", m."createdAt" ASC
        )
        SELECT AVG(EXTRACT(EPOCH FROM (fsr.seller_at - fbm.buyer_at)) / 60)::float AS avg_minutes,
               COUNT(*)::bigint AS n
        FROM first_buyer_msg fbm
        JOIN first_seller_reply fsr ON fsr."chatId" = fbm."chatId"
      `;
      return rows[0]?.avg_minutes ?? null;
    } catch (err) {
      this.logger.warn(`computeAvgResponseMinutes failed for ${userId}: ${(err as Error).message}`);
      return null;
    }
  }

  private responseMinutesToScore(minutes: number | null): number {
    // No message history at all → neutral, not punitive: a brand-new
    // seller with zero chats yet shouldn't score as "worst possible
    // response time." Flagged as an assumption, not a measured choice.
    if (minutes === null) return 50;
    if (minutes <= GOOD_RESPONSE_MINUTES) return 100;
    if (minutes >= BAD_RESPONSE_MINUTES) return 0;
    return Math.round(100 * (1 - (minutes - GOOD_RESPONSE_MINUTES) / (BAD_RESPONSE_MINUTES - GOOD_RESPONSE_MINUTES)));
  }

  /**
   * Photo count + 360° photo set presence (Image.tag) + description length
   * (longest ListingTranslation.description across locales), averaged
   * across the seller's ACTIVE listings.
   */
  private async computeListingQualityScore(userId: string): Promise<number> {
    const listings = await this.prisma.db('read').listing.findMany({
      where: { userId, status: 'ACTIVE', deletedAt: null },
      select: {
        images: { select: { tag: true } },
        translations: { select: { description: true } },
      },
    });

    if (listings.length === 0) return 50; // no active listings — neutral, not a penalty

    const perListingScores = listings.map((l: { images: { tag: string }[]; translations: { description: string | null }[] }) => {
      const photoCount = l.images.length;
      const has360 = l.images.some((img) => img.tag === '360_view');
      const maxDescLen = Math.max(0, ...l.translations.map((t) => t.description?.length ?? 0));

      const photoScore = Math.min(100, (photoCount / FULL_PHOTO_COUNT) * 100);
      const descScore = Math.min(100, (maxDescLen / FULL_DESCRIPTION_CHARS) * 100);
      const base = (photoScore + descScore) / 2;
      return Math.min(100, base + (has360 ? 10 : 0));
    });

    return Math.round(perListingScores.reduce((a: number, b: number) => a + b, 0) / perListingScores.length);
  }

  /**
   * % of the seller's ACTIVE listings priced at or below
   * AiService.suggestPrice()'s suggested figure (+5% tolerance).
   * NOTE: reuses suggestPrice as-is — including its existing GPT fallback
   * for <3 comparables. That fallback is rare for established makes/models
   * but not impossible; this is a deliberate reuse, not a new LLM
   * dependency introduced by this file (see this file's own header: "NO
   * LLM call anywhere in this file" refers to code THIS file adds, not to
   * suggestPrice's own pre-existing internals).
   */
  private async computePriceCompetitivenessScore(userId: string): Promise<number> {
    const listings = await this.prisma.db('read').listing.findMany({
      where: { userId, status: 'ACTIVE', deletedAt: null },
      select: {
        price: true,
        vehicleSpec: {
          select: {
            year: true,
            mileageKm: true,
            condition: true,
            brand: { select: { nameEn: true } },
            model: { select: { nameEn: true } },
          },
        },
      },
    });

    const priced = listings.filter(
      (l: any) => l.vehicleSpec?.brand?.nameEn && l.vehicleSpec?.year && l.vehicleSpec?.mileageKm != null,
    );
    if (priced.length === 0) return 50; // not enough spec data to judge — neutral

    let competitiveCount = 0;
    for (const l of priced as any[]) {
      try {
        const suggestion = await this.aiService.suggestPrice(
          l.vehicleSpec.brand.nameEn,
          l.vehicleSpec.model?.nameEn ?? '',
          l.vehicleSpec.year,
          l.vehicleSpec.mileageKm,
          l.vehicleSpec.condition ?? 'USED',
          'Iraq',
        );
        if (Number(l.price) <= suggestion.suggested * 1.05) competitiveCount++;
      } catch (err) {
        this.logger.warn(`suggestPrice failed during seller scoring: ${(err as Error).message}`);
      }
    }

    return Math.round((competitiveCount / priced.length) * 100);
  }

  /** Reports filed against this seller's listings, scaled 0-100 (100 = worst). */
  private async computeReportRateScore(userId: string): Promise<number> {
    const listingIds = (
      await this.prisma.db('read').listing.findMany({
        where: { userId, deletedAt: null },
        select: { id: true },
      })
    ).map((l: { id: string }) => l.id);

    if (listingIds.length === 0) return 0;

    const reportCount = await this.prisma.db('read').report.count({
      where: { targetType: 'LISTING', targetId: { in: listingIds } },
    });

    const ratio = reportCount / listingIds.length;
    return Math.min(100, Math.round(ratio * 100));
  }
}
