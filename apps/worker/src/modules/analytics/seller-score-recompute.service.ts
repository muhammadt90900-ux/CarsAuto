/**
 * apps/worker/src/modules/analytics/seller-score-recompute.service.ts  (verbatim copy of apps/api's)
 *
 * Prompt 5 — thin orchestrator: SellerScoreService (pure aggregation) →
 * SellerScoreNarrativeService (LLM) → persist. Kept separate from both so
 * each of those two stays independently testable/reusable (e.g. an admin
 * "recompute without regenerating the narrative" tool could call
 * SellerScoreService directly).
 */

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { SellerScoreService } from './seller-score.service';
import { SellerScoreNarrativeService } from './seller-score-narrative.service';

@Injectable()
export class SellerScoreRecomputeService {
  private readonly logger = new Logger(SellerScoreRecomputeService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly sellerScore: SellerScoreService,
    private readonly narrative: SellerScoreNarrativeService,
  ) {}

  async recompute(userId: string) {
    const components = await this.sellerScore.computeComponents(userId);
    const narrative = await this.narrative.generate(components);

    try {
      await this.prisma.sellerScore.upsert({
        where: { userId },
        create: { userId, ...components, ...narrative },
        update: { ...components, ...narrative, computedAt: new Date() },
      });
    } catch (err) {
      this.logger.warn(`Failed to persist SellerScore for ${userId}: ${(err as Error).message}`);
    }

    return { userId, ...components, ...narrative };
  }
}
