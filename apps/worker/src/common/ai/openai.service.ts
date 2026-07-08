/**
 * apps/worker/src/common/ai/openai.service.ts  (verbatim copy of apps/api's — see apps/worker/README.md)
 *
 * Singleton wrapper around the OpenAI SDK.
 * All methods degrade gracefully — if the key is missing or the API is down,
 * callers receive safe fallback values rather than thrown exceptions.
 *
 * Feature flags:
 *   OPENAI_ENABLED=true   (default) — enables all AI features
 *   OPENAI_ENABLED=false  — disables; every method returns its fallback immediately
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { AiCacheService } from './ai-cache.service';
import { AiCostTrackerService } from './ai-cost-tracker.service';

/**
 * Optional call-site context for cost tracking / cache scoping.
 * Added as an optional trailing parameter on embed()/complete()/moderate()
 * so every EXISTING caller (AiService.suggestPrice, detectSpamFull, etc.)
 * keeps compiling and behaving exactly as before with zero changes — this
 * is additive, not a breaking signature change. Callers that want their
 * usage attributed to a feature/user should start passing it; callers that
 * don't are logged under feature: 'unknown'.
 */
export interface AiCallMeta {
  /** e.g. 'suggestPrice', 'detectSpamFull', 'search.parseNaturalLanguage' */
  feature?: string;
  userId?: string | null;
  /** Cache TTL override in seconds. Ignored if cache=false. */
  cacheTtlSeconds?: number;
  /** Set false to bypass the cache for this call (default true). */
  cache?: boolean;
}

/* ── Public result types ─────────────────────────────────────────────────── */

export interface ModerationResult {
  flagged: boolean;
  categories: {
    hate: boolean;
    harassment: boolean;
    violence: boolean;
    sexual: boolean;
    selfHarm: boolean;
    other: boolean;
  };
  scores: Record<string, number>;
}

export interface TranslationResult {
  titleAr: string;
  titleEn: string;
  titleZh: string;
  descriptionAr: string;
  descriptionEn: string;
  descriptionZh: string;
}

/* ── Service ─────────────────────────────────────────────────────────────── */

@Injectable()
export class OpenAiService {
  private readonly logger = new Logger(OpenAiService.name);
  private readonly client: OpenAI | null;
  private readonly enabled: boolean;

  /** text-embedding-3-small → 1536 dimensions */
  private readonly embedModel: string;
  /** gpt-4o-mini for chat completions */
  private readonly chatModel: string;

  constructor(
    private readonly config: ConfigService,
    private readonly aiCache: AiCacheService,
    private readonly costTracker: AiCostTrackerService,
  ) {
    const apiKey = this.config.get<string>('OPENAI_API_KEY');
    const enabledFlag = this.config.get<string>('OPENAI_ENABLED', 'true');
    this.enabled = enabledFlag !== 'false' && !!apiKey;

    this.embedModel = this.config.get<string>(
      'OPENAI_MODEL_EMBED',
      'text-embedding-3-small',
    );
    this.chatModel = this.config.get<string>(
      'OPENAI_MODEL_CHAT',
      'gpt-4o-mini',
    );

    if (this.enabled && apiKey) {
      this.client = new OpenAI({ apiKey });
      this.logger.log(
        `OpenAI enabled — embed: ${this.embedModel}, chat: ${this.chatModel}`,
      );
    } else {
      this.client = null;
      this.logger.warn(
        'OpenAI disabled — OPENAI_ENABLED=false or OPENAI_API_KEY not set. All AI features will use fallbacks.',
      );
    }
  }

  /* ── 1. Single text embedding ────────────────────────────────────────── */

  /**
   * Returns a 1536-dimension float array for the given text.
   * Falls back to [] if OpenAI is unavailable — callers should treat [] as
   * "semantic search not possible, fall back to ILIKE".
   */
  async embed(text: string, meta?: AiCallMeta): Promise<number[]> {
    if (!this.client || !text?.trim()) return [];

    const input = text.slice(0, 8191); // API limit
    const useCache = meta?.cache !== false;
    const cacheKey = this.aiCache.hashKey(
      'openai',
      'embed',
      this.embedModel,
      this.aiCache.hashPart(input),
    );

    if (useCache) {
      const cached = await this.aiCache.get<number[]>(cacheKey);
      if (cached) return cached;
    }

    try {
      const response = await this.client.embeddings.create({
        model: this.embedModel,
        input,
        encoding_format: 'float',
      });
      const embedding = response.data[0]?.embedding ?? [];

      if (useCache && embedding.length) {
        // Embeddings for identical text never change — safe to cache long.
        await this.aiCache.set(cacheKey, embedding, meta?.cacheTtlSeconds ?? 30 * 24 * 3600);
      }

      void this.costTracker.log({
        feature: meta?.feature ?? 'unknown',
        model: this.embedModel,
        userId: meta?.userId ?? null,
        promptTokens: response.usage?.total_tokens ?? this.costTracker.estimateTokens(input),
        completionTokens: 0,
      });

      return embedding;
    } catch (err) {
      this.logger.warn(`embed() failed: ${(err as Error).message}`);
      return [];
    }
  }

  /* ── 2. Batch embeddings ─────────────────────────────────────────────── */

  /**
   * Embeds up to 100 texts in a single API call.
   * Maintains input order in the output array.
   */
  async embedBatch(texts: string[]): Promise<number[][]> {
    if (!this.client || texts.length === 0) return texts.map(() => []);

    const chunks: string[][] = [];
    for (let i = 0; i < texts.length; i += 100) {
      chunks.push(texts.slice(i, i + 100));
    }

    const results: number[][] = [];

    for (const chunk of chunks) {
      try {
        const response = await this.client.embeddings.create({
          model: this.embedModel,
          input: chunk.map((t) => t.slice(0, 8191)),
          encoding_format: 'float',
        });
        // Preserve order (API guarantees order matching input index)
        const ordered = response.data
          .sort((a, b) => a.index - b.index)
          .map((d) => d.embedding);
        results.push(...ordered);
      } catch (err) {
        this.logger.warn(`embedBatch() chunk failed: ${(err as Error).message}`);
        results.push(...chunk.map(() => []));
      }
    }

    return results;
  }

  /* ── 3. Content moderation ───────────────────────────────────────────── */

  /**
   * Checks text against OpenAI's moderation API (free endpoint).
   * Falls back to { flagged: false } so listings are never silently blocked
   * when the API is unavailable.
   */
  async moderate(text: string, meta?: AiCallMeta): Promise<ModerationResult> {
    const safe: ModerationResult = {
      flagged: false,
      categories: {
        hate: false,
        harassment: false,
        violence: false,
        sexual: false,
        selfHarm: false,
        other: false,
      },
      scores: {},
    };

    if (!this.client || !text?.trim()) return safe;

    const input = text.slice(0, 32_768);
    const useCache = meta?.cache !== false;
    const cacheKey = this.aiCache.hashKey('openai', 'moderate', this.aiCache.hashPart(input));

    if (useCache) {
      const cached = await this.aiCache.get<ModerationResult>(cacheKey);
      if (cached) return cached;
    }

    try {
      const response = await this.client.moderations.create({ input });

      const result = response.results[0];
      if (!result) return safe;

      const c = result.categories as unknown as Record<string, boolean>;
      const s = result.category_scores as unknown as Record<string, number>;

      const moderation: ModerationResult = {
        flagged: result.flagged,
        categories: {
          hate: c['hate'] ?? false,
          harassment: c['harassment'] ?? false,
          violence: c['violence'] ?? false,
          sexual: c['sexual'] ?? false,
          selfHarm: c['self-harm'] ?? false,
          other: c['illicit'] ?? false,
        },
        scores: s,
      };

      if (useCache) {
        await this.aiCache.set(cacheKey, moderation, meta?.cacheTtlSeconds ?? 24 * 3600);
      }

      // Moderation endpoint is free, but every call still counts against
      // OpenAI rate limits and is worth seeing in the usage dashboard.
      void this.costTracker.log({
        feature: meta?.feature ?? 'unknown',
        model: 'omni-moderation',
        userId: meta?.userId ?? null,
        promptTokens: this.costTracker.estimateTokens(input),
        completionTokens: 0,
      });

      return moderation;
    } catch (err) {
      this.logger.warn(`moderate() failed: ${(err as Error).message}`);
      return safe;
    }
  }

  /* ── 4. Translation ──────────────────────────────────────────────────── */

  /**
   * Translates Kurdish (Sorani) listing content into AR, EN, ZH.
   * Falls back to empty strings — frontend then displays the Kurdish source.
   *
   * System prompt instructs the model to preserve car model names, brand names,
   * and technical terms in their original form (e.g. "Toyota Camry" stays as-is).
   */
  async translateListing(
    titleKu: string,
    descriptionKu: string,
  ): Promise<TranslationResult> {
    const empty: TranslationResult = {
      titleAr: '',
      titleEn: '',
      titleZh: '',
      descriptionAr: '',
      descriptionEn: '',
      descriptionZh: '',
    };

    if (!this.client || !titleKu?.trim()) return empty;

    const systemPrompt = `You are a professional automotive translator specializing in Kurdish (Sorani), Arabic, English, and Chinese.
Rules:
1. Preserve car brand names, model names, and technical terms exactly as written (e.g. "Toyota Camry", "V6", "4WD").
2. Translate naturally for each target language — not word-for-word.
3. Keep the same tone and meaning as the source.
4. Return ONLY valid JSON with keys: titleAr, titleEn, titleZh, descriptionAr, descriptionEn, descriptionZh.
5. No preamble, no markdown fences, no extra text.`;

    const userPrompt = `Translate this Kurdish automotive listing:

TITLE (Kurdish): ${titleKu}

DESCRIPTION (Kurdish): ${descriptionKu || ''}

Return JSON only.`;

    try {
      const response = await this.client.chat.completions.create({
        model: this.chatModel,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.2,
        max_tokens: 1000,
        response_format: { type: 'json_object' },
      });

      const raw = response.choices[0]?.message?.content ?? '{}';
      const parsed = JSON.parse(raw) as Partial<TranslationResult>;

      return {
        titleAr: parsed.titleAr ?? '',
        titleEn: parsed.titleEn ?? '',
        titleZh: parsed.titleZh ?? '',
        descriptionAr: parsed.descriptionAr ?? '',
        descriptionEn: parsed.descriptionEn ?? '',
        descriptionZh: parsed.descriptionZh ?? '',
      };
    } catch (err) {
      this.logger.warn(`translateListing() failed: ${(err as Error).message}`);
      return empty;
    }
  }

  /* ── 5. Generic translation ──────────────────────────────────────────── */

  /**
   * Translates any text to the given language code.
   * Falls back to the original text.
   */
  async translate(text: string, targetLang: string): Promise<string> {
    if (!this.client || !text?.trim()) return text;

    try {
      const response = await this.client.chat.completions.create({
        model: this.chatModel,
        messages: [
          {
            role: 'system',
            content: `Translate the following text to ${targetLang}. Return only the translated text, nothing else.`,
          },
          { role: 'user', content: text },
        ],
        temperature: 0.1,
        max_tokens: 500,
      });
      return response.choices[0]?.message?.content?.trim() ?? text;
    } catch (err) {
      this.logger.warn(`translate() failed: ${(err as Error).message}`);
      return text;
    }
  }

  /* ── 6. Generic chat completion ──────────────────────────────────────── */

  /**
   * Low-level completion used by PriceIntelligence for GPT-based price estimates.
   * Falls back to empty string on failure.
   */
  async complete(
    prompt: string,
    systemPrompt = 'You are a helpful assistant.',
    jsonMode = false,
    meta?: AiCallMeta,
  ): Promise<string> {
    if (!this.client) return '';

    // Cache is OFF by default for complete() (unlike embed()/moderate()) —
    // unlike an embedding, "the same prompt" often isn't semantically
    // idempotent for existing callers (e.g. suggestPrice's GPT fallback can
    // reasonably return different phrasing call to call), and turning
    // caching on globally here could silently change behavior for callers
    // that never asked for it. Callers that DO want caching (e.g. Prompt 2's
    // parseNaturalLanguageQuery) should pass `meta.cache = true` explicitly.
    const useCache = meta?.cache === true;
    const cacheKey = this.aiCache.hashKey(
      'openai',
      'complete',
      this.chatModel,
      String(jsonMode),
      this.aiCache.hashPart(`${systemPrompt}\n${prompt}`),
    );

    if (useCache) {
      const cached = await this.aiCache.get<string>(cacheKey);
      if (cached !== null) return cached;
    }

    try {
      const response = await this.client.chat.completions.create({
        model: this.chatModel,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt },
        ],
        temperature: 0.3,
        max_tokens: 800,
        ...(jsonMode ? { response_format: { type: 'json_object' } } : {}),
      });
      const text = response.choices[0]?.message?.content?.trim() ?? '';
      const usage = response.usage;

      if (useCache && text) {
        await this.aiCache.set(cacheKey, text, meta?.cacheTtlSeconds ?? 3600);
      }

      void this.costTracker.log({
        feature: meta?.feature ?? 'unknown',
        model: this.chatModel,
        userId: meta?.userId ?? null,
        promptTokens: usage?.prompt_tokens ?? this.costTracker.estimateTokens(systemPrompt + prompt),
        completionTokens: usage?.completion_tokens ?? this.costTracker.estimateTokens(text),
      });

      return text;
    } catch (err) {
      this.logger.warn(`complete() failed: ${(err as Error).message}`);
      return '';
    }
  }

  /* ── Helpers ─────────────────────────────────────────────────────────── */

  /** True when OpenAI SDK is initialised and OPENAI_ENABLED=true */
  get isEnabled(): boolean {
    return this.enabled && this.client !== null;
  }
}
