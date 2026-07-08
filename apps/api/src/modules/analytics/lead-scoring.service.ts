/**
 * apps/api/src/modules/analytics/lead-scoring.service.ts
 *
 * Prompt 5 — Dealer Lead Scoring. Scores one DealerContactRequest at a
 * time (called once, shortly after the request is created — see this
 * file's KNOWN LIMITATION note below on why "once" rather than continuous).
 *
 * Four signals:
 *   1. messageLength       — proxy for buyer intent/seriousness (weight 0.20)
 *   2. priorListingClicks  — did THIS buyer previously click THIS listing
 *                            from search results? via SearchClick ⋈
 *                            SearchEvent.userId (weight 0.30)
 *   3. verifiedAccount     — sender.verified, if senderId present (weight 0.20)
 *   4. listingPopularity   — Favorite count on the listing (weight 0.30)
 *
 * SIGNAL-QUALITY NOTE: signal 4 is a property of the LISTING, not this
 * particular buyer — a popular listing gets a "hot" score boost on every
 * lead it receives, which is a defensible proxy (popular car → more
 * serious shoppers funnel toward it) but isn't the same kind of signal as
 * 1-3. Flagging so it isn't read as buyer-specific when reviewing scores.
 *
 * KNOWN LIMITATION: DealerContactRequest has no message thread — unlike
 * Chat/Message, there's no back-and-forth to observe "response speed" on
 * (the source prompt's bullet list mentions response speed as a possible
 * signal; it does not apply here the way it does to SellerScoreService,
 * which DOES have Chat/Message to measure against). If dealer replies to
 * leads get routed through Chat, response-time-to-lead becomes measurable
 * — schema currently has no FK linking a DealerContactRequest to the Chat
 * it may have spawned, so that isn't in scope in this pass.
 *
 * ANONYMOUS LEADS: senderId is nullable (anonymous form submissions are
 * allowed). priorListingClicks and verifiedAccount both fall back to
 * neutral (50) when there's no senderId to look up — an anonymous lead
 * isn't automatically scored as cold, just as "unknown" on those two axes.
 */

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { OpenAiService } from '../../common/ai/openai.service';

export interface LeadScoreResult {
  score: number;
  reasons: Record<string, { score: number; weight: number; detail: string }>;
  narrativeEn: string;
  narrativeKu: string;
  narrativeAr: string;
}

const MESSAGE_LENGTH_WEIGHT = 0.20;
const PRIOR_CLICKS_WEIGHT = 0.30;
const VERIFIED_WEIGHT = 0.20;
const POPULARITY_WEIGHT = 0.30;

const FULL_MESSAGE_LENGTH = 200; // chars → full credit
const FULL_CLICK_COUNT = 3; // repeat clicks on this listing → full credit
const FULL_FAVORITE_COUNT = 10; // favorites on this listing → full credit

const FALLBACK_NARRATIVE = {
  narrativeEn: 'New lead — review the message for details.',
  narrativeKu: 'مۆشتەرییەکی نوێ — نامەکە بخوێنەرەوە بۆ وردەکارییەکان.',
  narrativeAr: 'عميل محتمل جديد — راجع الرسالة للتفاصيل.',
};

@Injectable()
export class LeadScoringService {
  private readonly logger = new Logger(LeadScoringService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly openai: OpenAiService,
  ) {}

  async scoreLead(contactRequestId: string): Promise<LeadScoreResult> {
    const request = await this.prisma.db('read').dealerContactRequest.findUnique({
      where: { id: contactRequestId },
      select: {
        message: true,
        senderId: true,
        listingId: true,
        sender: { select: { verified: true } },
      },
    });

    if (!request) {
      throw new Error(`DealerContactRequest ${contactRequestId} not found`);
    }

    const reasons: LeadScoreResult['reasons'] = {};

    const msgLen = request.message?.length ?? 0;
    reasons.messageLength = {
      score: Math.min(100, Math.round((msgLen / FULL_MESSAGE_LENGTH) * 100)),
      weight: MESSAGE_LENGTH_WEIGHT,
      detail: `${msgLen} characters`,
    };

    reasons.priorListingClicks = await this.scorePriorClicks(request.senderId, request.listingId);
    reasons.verifiedAccount = {
      score: request.senderId ? (request.sender?.verified ? 100 : 30) : 50,
      weight: VERIFIED_WEIGHT,
      detail: request.senderId
        ? request.sender?.verified
          ? 'sender has a verified account'
          : 'sender account not verified'
        : 'anonymous submission — no account to check',
    };
    reasons.listingPopularity = await this.scoreListingPopularity(request.listingId);

    let weighted = 0;
    let totalWeight = 0;
    for (const r of Object.values(reasons)) {
      weighted += r.score * r.weight;
      totalWeight += r.weight;
    }
    const score = Math.max(0, Math.min(100, Math.round(totalWeight > 0 ? weighted / totalWeight : 0)));

    const narrative = await this.generateNarrative(score, reasons);

    await this.persist(contactRequestId, score, reasons, narrative);

    return { score, reasons, ...narrative };
  }

  private async scorePriorClicks(
    senderId: string | null,
    listingId: string | null,
  ): Promise<{ score: number; weight: number; detail: string }> {
    if (!senderId || !listingId) {
      return { score: 50, weight: PRIOR_CLICKS_WEIGHT, detail: 'no sender/listing to correlate against search history' };
    }

    try {
      const count = await this.prisma.db('read').searchClick.count({
        where: {
          listingId,
          searchEvent: { userId: senderId },
        },
      });
      return {
        score: Math.min(100, Math.round((count / FULL_CLICK_COUNT) * 100)),
        weight: PRIOR_CLICKS_WEIGHT,
        detail: `clicked this listing from search ${count} time(s) before contacting`,
      };
    } catch (err) {
      this.logger.warn(`scorePriorClicks failed: ${(err as Error).message}`);
      return { score: 50, weight: PRIOR_CLICKS_WEIGHT, detail: 'lookup failed' };
    }
  }

  private async scoreListingPopularity(
    listingId: string | null,
  ): Promise<{ score: number; weight: number; detail: string }> {
    if (!listingId) {
      return { score: 50, weight: POPULARITY_WEIGHT, detail: 'not tied to a specific listing' };
    }
    try {
      const count = await this.prisma.db('read').favorite.count({ where: { listingId } });
      return {
        score: Math.min(100, Math.round((count / FULL_FAVORITE_COUNT) * 100)),
        weight: POPULARITY_WEIGHT,
        detail: `${count} favorite(s) on this listing (listing-level, not buyer-specific)`,
      };
    } catch (err) {
      this.logger.warn(`scoreListingPopularity failed: ${(err as Error).message}`);
      return { score: 50, weight: POPULARITY_WEIGHT, detail: 'lookup failed' };
    }
  }

  private async generateNarrative(
    score: number,
    reasons: LeadScoreResult['reasons'],
  ): Promise<{ narrativeEn: string; narrativeKu: string; narrativeAr: string }> {
    const systemPrompt = `You write a single short (1 sentence) note for a car DEALER explaining why an incoming lead scored ${score}/100, based on the signals below. Be specific and actionable. Return ONLY JSON with keys narrative_en, narrative_ku (Sorani Kurdish), narrative_ar. No markdown fences.

SIGNALS: ${JSON.stringify(
      Object.fromEntries(Object.entries(reasons).map(([k, v]) => [k, { score: v.score, detail: v.detail }])),
    )}`;

    try {
      const raw = await this.openai.complete('Generate the note.', systemPrompt, true, {
        feature: 'analytics.leadScoreNarrative',
        cache: false,
      });
      if (!raw) return FALLBACK_NARRATIVE;

      const parsed = JSON.parse(raw) as { narrative_en?: string; narrative_ku?: string; narrative_ar?: string };
      return {
        narrativeEn: parsed.narrative_en || FALLBACK_NARRATIVE.narrativeEn,
        narrativeKu: parsed.narrative_ku || FALLBACK_NARRATIVE.narrativeKu,
        narrativeAr: parsed.narrative_ar || FALLBACK_NARRATIVE.narrativeAr,
      };
    } catch (err) {
      this.logger.warn(`Lead narrative generation failed — using fallback: ${(err as Error).message}`);
      return FALLBACK_NARRATIVE;
    }
  }

  private async persist(
    contactRequestId: string,
    score: number,
    reasons: LeadScoreResult['reasons'],
    narrative: { narrativeEn: string; narrativeKu: string; narrativeAr: string },
  ): Promise<void> {
    try {
      await this.prisma.dealerLeadScore.upsert({
        where: { contactRequestId },
        create: { contactRequestId, score, reasons: reasons as any, ...narrative },
        update: { score, reasons: reasons as any, ...narrative, computedAt: new Date() },
      });
    } catch (err) {
      this.logger.warn(`Failed to persist DealerLeadScore for ${contactRequestId}: ${(err as Error).message}`);
    }
  }
}
