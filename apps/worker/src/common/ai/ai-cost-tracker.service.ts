/**
 * apps/worker/src/common/ai/ai-cost-tracker.service.ts  (verbatim copy of apps/api's — see apps/worker/README.md)
 *
 * Prompt 1, Step 2: logs every LLM call to AiUsageLog.
 *
 * Design notes:
 * - `log()` is fire-and-forget from the caller's point of view: it never
 *   throws. A failure to write a usage log must NEVER break the actual
 *   AI feature (embed/complete/moderate) that triggered it — cost
 *   tracking is observability, not a correctness dependency.
 * - Token counts here are ESTIMATES (see estimateTokens()), not the exact
 *   usage.prompt_tokens/completion_tokens the OpenAI SDK returns — the
 *   current OpenAiService methods don't surface the raw API response object
 *   to callers, only the extracted string/array/result, so we approximate
 *   from input/output text length. Swapping in exact SDK token counts later
 *   is a non-breaking change to the `record` shape (see PRICING map below
 *   for where real per-model rates are the other approximation to revisit).
 */

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface AiUsageRecord {
  feature: string;
  model: string;
  userId?: string | null;
  promptTokens: number;
  completionTokens: number;
}

// USD per 1M tokens, (input, output). Update when OpenAI pricing changes or
// new models are added — unknown models fall back to the gpt-4o-mini rate
// so estimatedCostUsd is never left at exactly 0 for a real call.
const PRICING_PER_MILLION: Record<string, { input: number; output: number }> = {
  'gpt-4o-mini': { input: 0.15, output: 0.6 },
  'gpt-4o': { input: 2.5, output: 10 },
  'text-embedding-3-small': { input: 0.02, output: 0 },
  'text-embedding-3-large': { input: 0.13, output: 0 },
  // Moderation endpoint is free — kept as an explicit zero-rate entry
  // (rather than falling through to DEFAULT_PRICING) so moderate() calls
  // are visible in AiUsageLog for volume tracking without implying a cost.
  'omni-moderation': { input: 0, output: 0 },
};
const DEFAULT_PRICING = PRICING_PER_MILLION['gpt-4o-mini'];

@Injectable()
export class AiCostTrackerService {
  private readonly logger = new Logger(AiCostTrackerService.name);

  constructor(private readonly prisma: PrismaService) {}

  /** Rough token estimate from raw text — ~4 chars/token for English; used
   *  only when the caller doesn't already have a token count from the SDK. */
  estimateTokens(text: string): number {
    if (!text) return 0;
    return Math.ceil(text.length / 4);
  }

  estimateCostUsd(model: string, promptTokens: number, completionTokens: number): number {
    const rate = PRICING_PER_MILLION[model] ?? DEFAULT_PRICING;
    const cost = (promptTokens * rate.input + completionTokens * rate.output) / 1_000_000;
    return Number(cost.toFixed(6));
  }

  /**
   * Persists one usage record. Never throws — logs a warning and swallows
   * DB errors so a Postgres blip can't take down an AI feature.
   */
  async log(record: AiUsageRecord): Promise<void> {
    try {
      const estimatedCostUsd = this.estimateCostUsd(
        record.model,
        record.promptTokens,
        record.completionTokens,
      );

      await this.prisma.aiUsageLog.create({
        data: {
          feature: record.feature,
          model: record.model,
          userId: record.userId ?? null,
          promptTokens: record.promptTokens,
          completionTokens: record.completionTokens,
          estimatedCostUsd,
        },
      });
    } catch (err) {
      this.logger.warn(`Failed to write AiUsageLog: ${(err as Error).message}`);
    }
  }
}
