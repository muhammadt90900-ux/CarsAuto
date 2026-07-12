/**
 * apps/api/src/common/trust/trust-profile.service.ts
 *
 * Trust & Safety Prompt 6. Small reusable read path so
 * listings.service.ts's findOne() and users.service.ts's findByIdPublic()
 * don't each hand-roll the same FraudScore/SellerScore/review-aggregate
 * query shape — call getTrustProfile(userId) once, get back exactly what's
 * safe to put in a public response: a single 0-100 number and the badge
 * list. FraudScore.overallRisk (admin-only) is read here but never
 * returned — see trust-score.util.ts's header for why that boundary
 * matters.
 *
 * Three small indexed queries, run in parallel. Not folded into
 * listings.service.ts's/users.service.ts's own `include` trees on purpose:
 * those two call sites have very different existing include shapes, and a
 * single small parallel Promise.all here is simpler to keep correct than
 * asking two different large queries to grow matching nested-select
 * blocks for the same four fields.
 */

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { computeTrustScore } from './trust-score.util';

export interface TrustProfile {
  trustScore: number;
  badges: { code: string; awardedAt: Date }[];
}

@Injectable()
export class TrustProfileService {
  constructor(private readonly prisma: PrismaService) {}

  async getTrustProfile(userId: string, identityVerified: boolean): Promise<TrustProfile> {
    const [sellerScore, fraudScore, reviewAgg, badges] = await Promise.all([
      this.prisma.sellerScore.findUnique({
        where: { userId },
        select: { overallScore: true },
      }),
      this.prisma.fraudScore.findUnique({
        where: { userId },
        select: { overallRisk: true }, // read only — never put this on the response object
      }),
      this.prisma.review.aggregate({
        where: { revieweeId: userId },
        _avg: { rating: true },
        _count: { rating: true },
      }),
      this.prisma.userBadge.findMany({
        where: { userId, OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] },
        select: { code: true, awardedAt: true },
        orderBy: { awardedAt: 'desc' },
      }),
    ]);

    const trustScore = computeTrustScore({
      sellerScoreOverall: sellerScore?.overallScore ?? null,
      identityVerified,
      avgRating: reviewAgg._avg.rating ?? null,
      reviewCount: reviewAgg._count.rating,
      fraudOverallRisk: fraudScore?.overallRisk ?? null,
    });

    return { trustScore, badges };
  }
}
