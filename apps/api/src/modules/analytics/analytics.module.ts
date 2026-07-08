/**
 * apps/api/src/modules/analytics/analytics.module.ts
 *
 * Prompt 5 — hosts SellerScoreService/SellerScoreNarrativeService/
 * SellerScoreRecomputeService and LeadScoringService. Imports AiModule for
 * AiService.suggestPrice() (used by SellerScoreService's price-
 * competitiveness signal).
 */

import { Module } from '@nestjs/common';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { AiModule } from '../ai/ai.module';
import { SellerScoreService } from './seller-score.service';
import { SellerScoreNarrativeService } from './seller-score-narrative.service';
import { SellerScoreRecomputeService } from './seller-score-recompute.service';
import { LeadScoringService } from './lead-scoring.service';

@Module({
  imports: [PrismaModule, AiModule],
  providers: [SellerScoreService, SellerScoreNarrativeService, SellerScoreRecomputeService, LeadScoringService],
  exports: [SellerScoreService, SellerScoreNarrativeService, SellerScoreRecomputeService, LeadScoringService],
})
export class AnalyticsModule {}
