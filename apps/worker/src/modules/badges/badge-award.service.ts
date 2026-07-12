/**
 * apps/worker/src/modules/badges/badge-award.service.ts
 *
 * Trust & Safety Prompt 6 — nightly badge reconciliation. Worker-only (no
 * apps/api mirror exists yet — unlike FraudScoringService, there's no
 * admin-triggered single-user on-demand path requested for this prompt;
 * if one gets added later, mirror it the same way Prompt 4 mirrored
 * FraudScoringService, same duplication convention).
 *
 * Badge codes handled here (all four from UserBadge's Prompt 1 schema
 * comment):
 *   - ID_VERIFIED     — IdVerification.status === 'APPROVED'
 *   - TOP_RATED        — SellerScore.overallScore >= 85 AND reviewCount >= 10
 *   - FAST_RESPONDER    — SellerScore.avgResponseMinutes <= 30 (and not null)
 *   - TRUSTED_SELLER    — all three of the above AND FraudScore.overallRisk < 20
 *
 * RECONCILIATION, NOT JUST AWARDING: each run computes the user's CURRENT
 * eligible set and adds what's missing AND REMOVES badges they no longer
 * qualify for. This wasn't explicitly spelled out in the prompt, but a
 * badge that never gets revoked once a seller's numbers slip stops meaning
 * anything — the entire point of computing this nightly (mirroring
 * FraudScore/SellerScore's own fully-recomputed-not-patched pattern) is
 * that it reflects CURRENT standing. Flagging this as a judgment call, not
 * hiding it: if badges are meant to be "earned once, kept forever"
 * instead, remove the deletion branch below.
 *
 * KNOWN GAP (inherited from Prompt 1's schema, not introduced here):
 * UserBadge has no @@unique([userId, code]) constraint — this service
 * guards against duplicate awards at the application level (check-then-
 * create, same pattern as verification.service.ts's awardBadgeIfMissing()
 * in Prompt 2), same as noted there.
 */

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

const TOP_RATED_MIN_SCORE = 85;
const TOP_RATED_MIN_REVIEWS = 10;
const FAST_RESPONDER_MAX_MINUTES = 30;
const TRUSTED_SELLER_MAX_RISK = 20;

const MANAGED_BADGE_CODES = ['ID_VERIFIED', 'TOP_RATED', 'FAST_RESPONDER', 'TRUSTED_SELLER'] as const;
type ManagedBadgeCode = (typeof MANAGED_BADGE_CODES)[number];

@Injectable()
export class BadgeAwardService {
  private readonly logger = new Logger(BadgeAwardService.name);

  constructor(private readonly prisma: PrismaService) {}

  async reconcileBadges(userId: string): Promise<void> {
    const [idVerification, sellerScore, fraudScore, reviewCount, existingBadges] = await Promise.all([
      this.prisma.idVerification.findUnique({ where: { userId }, select: { status: true } }),
      this.prisma.sellerScore.findUnique({
        where: { userId },
        select: { overallScore: true, avgResponseMinutes: true },
      }),
      this.prisma.fraudScore.findUnique({ where: { userId }, select: { overallRisk: true } }),
      this.prisma.review.count({ where: { revieweeId: userId } }),
      this.prisma.userBadge.findMany({
        where: { userId, code: { in: MANAGED_BADGE_CODES as unknown as string[] } },
        select: { code: true },
      }),
    ]);

    const isIdVerified = idVerification?.status === 'APPROVED';
    const isTopRated = !!sellerScore && sellerScore.overallScore >= TOP_RATED_MIN_SCORE && reviewCount >= TOP_RATED_MIN_REVIEWS;
    const isFastResponder =
      !!sellerScore && sellerScore.avgResponseMinutes !== null && sellerScore.avgResponseMinutes <= FAST_RESPONDER_MAX_MINUTES;
    const isTrustedSeller =
      isIdVerified && isTopRated && isFastResponder && !!fraudScore && fraudScore.overallRisk < TRUSTED_SELLER_MAX_RISK;

    const eligible: Record<ManagedBadgeCode, boolean> = {
      ID_VERIFIED: isIdVerified,
      TOP_RATED: isTopRated,
      FAST_RESPONDER: isFastResponder,
      TRUSTED_SELLER: isTrustedSeller,
    };

    const existingCodes = new Set(existingBadges.map((b: { code: string }) => b.code));

    const toAward = MANAGED_BADGE_CODES.filter((code) => eligible[code] && !existingCodes.has(code));
    const toRevoke = MANAGED_BADGE_CODES.filter((code) => !eligible[code] && existingCodes.has(code));

    if (toAward.length === 0 && toRevoke.length === 0) return;

    await this.prisma.$transaction([
      ...toAward.map((code) =>
        this.prisma.userBadge.create({ data: { userId, code } }),
      ),
      ...toRevoke.map((code) =>
        this.prisma.userBadge.deleteMany({ where: { userId, code } }),
      ),
    ]);

    if (toAward.length) this.logger.log(`Awarded badges to user ${userId}: ${toAward.join(', ')}`);
    if (toRevoke.length) this.logger.log(`Revoked badges from user ${userId}: ${toRevoke.join(', ')}`);
  }
}
