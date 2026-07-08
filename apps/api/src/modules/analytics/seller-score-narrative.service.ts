/**
 * apps/api/src/modules/analytics/seller-score-narrative.service.ts
 *
 * Prompt 5 — takes SellerScoreComponents (pure numbers, no AI) and
 * generates a short KU/AR/EN tip, following the same
 * reasoning/reasoningKu/reasoningAr pattern PriceSuggestion already uses
 * in ai.service.ts.
 */

import { Injectable, Logger } from '@nestjs/common';
import { OpenAiService } from '../../common/ai/openai.service';
import { SellerScoreComponents } from './seller-score.service';

export interface SellerScoreNarrative {
  narrativeEn: string;
  narrativeKu: string;
  narrativeAr: string;
}

const FALLBACK: SellerScoreNarrative = {
  narrativeEn: 'Keep responding quickly, add more photos, and price competitively to improve your score.',
  narrativeKu: 'خێرا وەڵامی نامەکان بدەرەوە، وێنەی زیاتر زیاد بکە، و نرخێکی گونجاو دابنێ بۆ باشترکردنی خاڵەکەت.',
  narrativeAr: 'استمر بالرد بسرعة، أضف المزيد من الصور، وسعّر بشكل تنافسي لتحسين نقاطك.',
};

@Injectable()
export class SellerScoreNarrativeService {
  private readonly logger = new Logger(SellerScoreNarrativeService.name);

  constructor(private readonly openai: OpenAiService) {}

  async generate(components: SellerScoreComponents): Promise<SellerScoreNarrative> {
    const systemPrompt = `You write a single short (1-2 sentence), encouraging, actionable tip for a car-marketplace SELLER based on their performance score breakdown below. Be specific about their weakest component. Return ONLY a JSON object with exactly these keys: narrative_en, narrative_ku, narrative_ar (narrative_ku in Sorani Kurdish, narrative_ar in Arabic). No markdown fences, no preamble.

SCORE BREAKDOWN (0-100 each, 100 = best except reportRateScore where 100 = worst):
- responseTimeScore: ${components.responseTimeScore} (avg reply time: ${components.avgResponseMinutes ?? 'no data'} min)
- listingQualityScore: ${components.listingQualityScore}
- priceCompetitivenessScore: ${components.priceCompetitivenessScore}
- reportRateScore: ${components.reportRateScore}
- overallScore: ${components.overallScore}`;

    try {
      const raw = await this.openai.complete('Generate the tip.', systemPrompt, true, {
        feature: 'analytics.sellerScoreNarrative',
        cache: false, // score breakdown changes every recompute — caching would go stale immediately
      });

      if (!raw) return FALLBACK;

      const parsed = JSON.parse(raw) as { narrative_en?: string; narrative_ku?: string; narrative_ar?: string };
      return {
        narrativeEn: parsed.narrative_en || FALLBACK.narrativeEn,
        narrativeKu: parsed.narrative_ku || FALLBACK.narrativeKu,
        narrativeAr: parsed.narrative_ar || FALLBACK.narrativeAr,
      };
    } catch (err) {
      this.logger.warn(`Narrative generation failed — using fallback: ${(err as Error).message}`);
      return FALLBACK;
    }
  }
}
