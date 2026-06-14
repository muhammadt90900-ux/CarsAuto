/**
 * apps/api/src/modules/ai/ai.service.ts
 *
 * FEATURE 2C + 2D — Price Intelligence & AI Content Moderation
 *
 * Changes from original:
 *  - suggestPrice() now uses IQR outlier removal + GPT-4o-mini fallback
 *  - detectSpam() uses OpenAI moderation API + enhanced heuristic scoring
 *  - All original recommendation methods preserved and untouched
 */

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { OpenAiService } from '../../common/ai/openai.service';

/* ── Public types ────────────────────────────────────────────────────────── */

export interface RecommendationContext {
  listingId?: string;
  userId?: string;
  budget?: number;
  currency?: string;
  country?: string;
  locale?: string;
  searchHistory?: string[];
  limit?: number;
}

export interface RecommendedListing {
  id: string;
  score: number;
  reason: string;
  reasonKey: string;
  listing: any;
}

export interface PriceSuggestion {
  suggested: number;
  min: number;
  max: number;
  confidence: 'high' | 'medium' | 'low';
  sampleSize: number;
  currency: string;
  reasoning: string;
  reasoningKu: string;
  reasoningAr: string;
}

export interface SpamResult {
  isSpam: boolean;
  score: number;
  reasons: string[];
}

export interface ModerationCheckResult {
  shouldQuarantine: boolean;
  flaggedCategories: string[];
  spamResult: SpamResult;
}

/* ── Scoring weights ─────────────────────────────────────────────────────── */

const W = {
  BRAND_MATCH:        30,
  MODEL_MATCH:        25,
  PRICE_PROXIMITY:    20,
  YEAR_PROXIMITY:     10,
  BODY_TYPE_MATCH:    8,
  FUEL_TYPE_MATCH:    5,
  LOCATION_MATCH:     7,
  SEARCH_KEYWORD:     15,
  TRENDING:           5,
  COUNTRY_POPULARITY: 8,
};

const REASON_LABELS: Record<string, Record<string, string>> = {
  similar_car: { ku: 'ئۆتۆمبێلی هاوشێوە', ar: 'سيارة مماثلة', en: 'Similar car' },
  budget:      { ku: 'گونجاوە بۆ بودجەکەت', ar: 'مناسب لميزانيتك', en: 'Fits your budget' },
  search:      { ku: 'پەیوەندیدارە بە گەڕانەکانت', ar: 'يتعلق بعمليات بحثك', en: 'Based on your searches' },
  country:     { ku: 'بەناوبانگە لە هەرێمەکەت', ar: 'شائع في منطقتك', en: 'Popular in your region' },
  trending:    { ku: 'ترێندی ئێستا', ar: 'رائج الآن', en: 'Trending now' },
};

const COUNTRY_BRAND_AFFINITY: Record<string, string[]> = {
  IQ: ['toyota', 'kia', 'hyundai', 'nissan', 'honda'],
  SA: ['toyota', 'lexus', 'gmc', 'ford', 'chevrolet'],
  AE: ['bmw', 'mercedes-benz', 'toyota', 'nissan', 'range-rover', 'lexus', 'porsche'],
  TR: ['renault', 'fiat', 'toyota', 'volkswagen', 'ford'],
  IR: ['peugeot', 'renault', 'kia', 'hyundai', 'toyota'],
  DE: ['volkswagen', 'bmw', 'mercedes-benz', 'audi', 'opel'],
  CN: ['byd', 'geely', 'great-wall', 'chery', 'nio', 'li-auto', 'xpeng', 'toyota', 'volkswagen'],
  DEFAULT: ['toyota', 'hyundai', 'kia', 'nissan', 'honda'],
};

// Pressure / urgency words that appear in spam listings (ku + ar + en)
const SPAM_PRESSURE_WORDS = [
  // Kurdish
  'خێرا', 'دواکەوتن', 'تەنها', 'پێشکەش',
  // Arabic
  'عروض', 'فرصة', 'لا تفوت', 'اسرع', 'فقط',
  // English
  'hurry', 'limited', 'act now', 'exclusive offer', 'best deal',
];

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly openai: OpenAiService,
  ) {}

  /* ── 1. Price Intelligence (FEATURE 2C) ──────────────────────────────── */

  /**
   * Returns a price suggestion with confidence level based on comparable listings.
   *
   * Algorithm:
   *  ≥10 comparables → IQR outlier removal, mean ± std dev, confidence = 'high'
   *  3–9 comparables → median ± 15%, confidence = 'medium'
   *  <3 comparables  → GPT-4o-mini estimate, confidence = 'low'
   */
  async suggestPrice(
    make: string,
    model: string,
    year: number,
    mileage: number,
    condition = 'USED',
    location = 'Iraq',
  ): Promise<PriceSuggestion> {
    const currency = 'USD';

    // Fetch comparable listings (same brand/model name, year ±2)
    const comparable = await this.prisma.listing.findMany({
      where: {
        status: 'ACTIVE',
        vehicleSpec: {
          is: {
            year: { gte: year - 2, lte: year + 2 },
            mileageKm: { lte: mileage + 30_000 },
            ...(condition ? { condition: condition as any } : {}),
            brand: { nameEn: { contains: make, mode: 'insensitive' } },
          },
        },
      },
      select: { price: true },
      take: 30,
    }).catch(() => []);

    const prices = comparable.map((l: { price: any }) => Number(l.price)).sort((a: number, b: number) => a - b);
    const sampleSize = prices.length;

    // ── High confidence: ≥10 samples, use IQR ────────────────────────────
    if (sampleSize >= 10) {
      const q1 = prices[Math.floor(sampleSize * 0.25)]!;
      const q3 = prices[Math.floor(sampleSize * 0.75)]!;
      const iqr = q3 - q1;
      const filtered = prices.filter(
        (p) => p >= q1 - 1.5 * iqr && p <= q3 + 1.5 * iqr,
      );

      const mean = filtered.reduce((a, b) => a + b, 0) / filtered.length;
      const variance = filtered.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / filtered.length;
      const std = Math.sqrt(variance);

      const suggested = Math.round(mean);
      const min = Math.round(Math.max(mean - std, mean * 0.7));
      const max = Math.round(mean + std);

      return {
        suggested, min, max,
        confidence: 'high',
        sampleSize,
        currency,
        reasoning: `Based on ${sampleSize} similar listings`,
        reasoningKu: `بەپێی ${sampleSize} لیستی هاوشێوە`,
        reasoningAr: `بناءً على ${sampleSize} قوائم مماثلة`,
      };
    }

    // ── Medium confidence: 3–9 samples, use median ───────────────────────
    if (sampleSize >= 3) {
      const mid = Math.floor(sampleSize / 2);
      const median = prices[mid]!;

      return {
        suggested: Math.round(median),
        min: Math.round(median * 0.85),
        max: Math.round(median * 1.15),
        confidence: 'medium',
        sampleSize,
        currency,
        reasoning: `Estimated from ${sampleSize} comparable listings`,
        reasoningKu: `خەمڵاندراوە لە ${sampleSize} لیستی هاوشێوە`,
        reasoningAr: `مقدرة من ${sampleSize} قوائم مماثلة`,
      };
    }

    // ── Low confidence: <3 samples, ask GPT ──────────────────────────────
    const gptResult = await this._gptPriceEstimate(make, model, year, mileage, condition, location);
    return { ...gptResult, sampleSize, currency };
  }

  private async _gptPriceEstimate(
    make: string,
    model: string,
    year: number,
    mileage: number,
    condition: string,
    location: string,
  ): Promise<Omit<PriceSuggestion, 'sampleSize' | 'currency'>> {
    const systemPrompt = `You are a car pricing expert for the Iraqi/Kurdistan and Middle East automotive market.
You have deep knowledge of used car values in Iraq, Kurdistan Region, UAE, and neighbouring markets.
Return only valid JSON. No preamble, no markdown.`;

    const userPrompt = `Estimate the market price in USD for:
Make: ${make}
Model: ${model}
Year: ${year}
Mileage: ${mileage} km
Condition: ${condition}
Location: ${location}

Respond with JSON only:
{
  "suggested": <number>,
  "min": <number>,
  "max": <number>,
  "reasoning_en": "<one sentence>",
  "reasoning_ku": "<one sentence in Sorani Kurdish>",
  "reasoning_ar": "<one sentence in Arabic>"
}`;

    const raw = await this.openai.complete(userPrompt, systemPrompt, true);

    if (!raw) {
      // Pure heuristic fallback when OpenAI is also unavailable
      const base = 10_000;
      const agePenalty = (new Date().getFullYear() - year) * 600;
      const mileagePenalty = mileage * 0.01;
      const suggested = Math.max(base - agePenalty - mileagePenalty, 1_500);
      return {
        suggested: Math.round(suggested),
        min: Math.round(suggested * 0.8),
        max: Math.round(suggested * 1.2),
        confidence: 'low',
        reasoning: 'Heuristic estimate (insufficient market data)',
        reasoningKu: 'خەمڵاندنی تایبەتمەند (داتای بازاڕ بەسەرنەکەوت)',
        reasoningAr: 'تقدير تقريبي (بيانات السوق غير كافية)',
      };
    }

    try {
      const parsed = JSON.parse(raw);
      return {
        suggested: Number(parsed.suggested) || 5_000,
        min: Number(parsed.min) || 3_000,
        max: Number(parsed.max) || 8_000,
        confidence: 'low',
        reasoning: parsed.reasoning_en ?? 'AI price estimate',
        reasoningKu: parsed.reasoning_ku ?? 'خەمڵاندنی AI',
        reasoningAr: parsed.reasoning_ar ?? 'تقدير الذكاء الاصطناعي',
      };
    } catch {
      this.logger.warn('Failed to parse GPT price estimate JSON');
      return {
        suggested: 5_000,
        min: 3_000,
        max: 8_000,
        confidence: 'low',
        reasoning: 'Estimate unavailable',
        reasoningKu: 'خەمڵاندن بەردەست نییە',
        reasoningAr: 'التقدير غير متاح',
      };
    }
  }

  /* ── 2. Content Moderation (FEATURE 2D) ──────────────────────────────── */

  /**
   * Checks listing content against OpenAI moderation API + spam heuristics.
   * Returns whether the listing should be quarantined (UNDER_REVIEW).
   *
   * Never throws — if all checks fail, returns shouldQuarantine=false
   * so listings are never silently blocked due to API issues.
   */
  async checkContent(
    title: string,
    description: string,
  ): Promise<ModerationCheckResult> {
    const combinedText = `${title} ${description ?? ''}`.trim();

    // Run moderation and spam check in parallel
    const [modResult, spamResult] = await Promise.all([
      this.openai.moderate(combinedText),
      this.detectSpamFull(combinedText),
    ]);

    const flaggedCategories = modResult.flagged
      ? Object.entries(modResult.categories)
          .filter(([, v]) => v)
          .map(([k]) => k)
      : [];

    const shouldQuarantine = modResult.flagged || spamResult.isSpam;

    return { shouldQuarantine, flaggedCategories, spamResult };
  }

  /**
   * Spam detection:
   *  1. OpenAI moderation API (free, fast) — flagged content = instant spam
   *  2. Heuristic scoring on pattern matches
   *
   * Score > 25 = spam
   */
  async detectSpamFull(text: string): Promise<SpamResult> {
    const reasons: string[] = [];
    let score = 0;

    // --- OpenAI moderation first ---
    const modResult = await this.openai.moderate(text);
    if (modResult.flagged) {
      return { isSpam: true, score: 100, reasons: ['openai_moderation_flagged'] };
    }

    // --- Heuristic scoring ---

    // Phone numbers in description (+10)
    if (/(\+964|07\d{9}|\d{4}[-\s]\d{4}[-\s]\d{4})/.test(text)) {
      score += 10;
      reasons.push('phone_number_in_description');
    }

    // URLs in description (+15)
    if (/https?:\/\/[^\s]+|www\.[^\s]+/.test(text)) {
      score += 15;
      reasons.push('url_in_description');
    }

    // Pressure words (+8 each, max 3)
    let pressureHits = 0;
    for (const word of SPAM_PRESSURE_WORDS) {
      if (text.toLowerCase().includes(word.toLowerCase())) {
        pressureHits++;
        if (pressureHits <= 3) score += 8;
      }
    }
    if (pressureHits > 0) {
      reasons.push(`pressure_words_${pressureHits}`);
    }

    // ALL CAPS > 30% of words (+10)
    const words = text.split(/\s+/).filter((w) => w.length > 2);
    if (words.length > 0) {
      const capsCount = words.filter((w) => w === w.toUpperCase() && /[A-Z]/.test(w)).length;
      if (capsCount / words.length > 0.3) {
        score += 10;
        reasons.push('excessive_caps');
      }
    }

    // Repeated characters (e.g. "!!!!!" or "?????")
    if (/(.)\1{4,}/.test(text)) {
      score += 5;
      reasons.push('repeated_characters');
    }

    return {
      isSpam: score > 25,
      score,
      reasons,
    };
  }

  /**
   * Legacy detectSpam() — kept for backwards compatibility.
   * Now delegates to detectSpamFull() and returns the boolean.
   */
  async detectSpam(text: string): Promise<boolean> {
    const result = await this.detectSpamFull(text);
    return result.isSpam;
  }

  /* ── 3. Core recommendation engine (unchanged) ───────────────────────── */

  async recommend(ctx: RecommendationContext): Promise<RecommendedListing[]> {
    const limit = Math.min(ctx.limit ?? 8, 20);
    const locale = ctx.locale ?? 'en';

    const anchor = ctx.listingId
      ? await this.prisma.listing
          .findUnique({
            where: { id: ctx.listingId },
            include: {
              vehicleSpec: { include: { brand: true, model: true, trim: true } },
              location: true,
            },
          })
          .catch(() => null)
      : null;

    const candidates = await this.prisma.listing.findMany({
      where: {
        status: 'ACTIVE',
        id: ctx.listingId ? { not: ctx.listingId } : undefined,
      },
      include: {
        images: { where: { isCover: true }, take: 1 },
        location: true,
        vehicleSpec: {
          include: {
            brand: { select: { id: true, nameEn: true, nameAr: true, nameKu: true, logoUrl: true } },
            model: { select: { id: true, nameEn: true, nameAr: true, nameKu: true } },
            trim:  { select: { id: true, name: true, bodyType: true, fuelType: true, transmission: true } },
          },
        },
        user: { select: { id: true, name: true, avatar: true, verified: true } },
      },
      orderBy: [{ featured: 'desc' }, { views: 'desc' }, { createdAt: 'desc' }],
      take: 200,
    });

    const countryKey = (ctx.country ?? 'DEFAULT').toUpperCase();
    const preferredBrands: string[] =
      COUNTRY_BRAND_AFFINITY[countryKey] ?? COUNTRY_BRAND_AFFINITY['DEFAULT'] ?? [];

    const scored = candidates.map((listing: any) => {
      let score = 0;
      const reasons: string[] = [];

      const spec = listing.vehicleSpec;
      const anchorSpec = anchor?.vehicleSpec;

      if (anchorSpec) {
        if (spec?.brandId === anchorSpec.brandId) { score += W.BRAND_MATCH; reasons.push('similar_car'); }
        if (spec?.modelId === anchorSpec.modelId) score += W.MODEL_MATCH;
        if (spec?.trim?.bodyType && spec.trim.bodyType === anchorSpec.trim?.bodyType) score += W.BODY_TYPE_MATCH;
        if (spec?.trim?.fuelType && spec.trim.fuelType === anchorSpec.trim?.fuelType) score += W.FUEL_TYPE_MATCH;
        if (spec?.year && anchorSpec.year) {
          const diff = Math.abs(spec.year - anchorSpec.year);
          if (diff <= 3) score += W.YEAR_PROXIMITY * (1 - diff / 3);
        }
        if (listing.locationId && anchor?.locationId && listing.locationId === anchor.locationId) {
          score += W.LOCATION_MATCH;
        }
      }

      if (ctx.budget && ctx.budget > 0) {
        const budgetMax = ctx.budget * 1.15;
        const budgetMin = ctx.budget * 0.6;
        if (listing.price >= budgetMin && listing.price <= budgetMax) {
          score += W.PRICE_PROXIMITY; reasons.push('budget');
        } else if (listing.price <= ctx.budget) {
          score += W.PRICE_PROXIMITY * 0.5; reasons.push('budget');
        }
      }

      if (ctx.searchHistory?.length) {
        const searchText = [listing.titleEn, listing.titleKu, listing.titleAr, spec?.brand?.nameEn, spec?.model?.nameEn]
          .filter(Boolean).join(' ').toLowerCase();
        const hitCount = ctx.searchHistory.filter((term) => searchText.includes(term.toLowerCase())).length;
        if (hitCount > 0) { score += W.SEARCH_KEYWORD * Math.min(hitCount, 2); reasons.push('search'); }
      }

      if (spec?.brand?.nameEn) {
        const idx = preferredBrands.indexOf(spec.brand.nameEn.toLowerCase());
        if (idx !== -1) { score += W.COUNTRY_POPULARITY * (1 - idx / preferredBrands.length); reasons.push('country'); }
      }

      const ageHours = (Date.now() - new Date(listing.createdAt).getTime()) / 3_600_000;
      const viewRate = listing.views / Math.max(ageHours, 1);
      if (viewRate > 0.5) { score += W.TRENDING; reasons.push('trending'); }

      const uniqueReasons = [...new Set(reasons)];
      const bestReason = uniqueReasons[0] ?? 'trending';

      return {
        id: listing.id,
        score: Math.round(Math.min(score, 100)),
        reason: REASON_LABELS[bestReason]?.[locale] ?? REASON_LABELS[bestReason]?.['en'] ?? '',
        reasonKey: bestReason,
        listing,
      };
    });

    return (scored as RecommendedListing[])
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .filter((r) => r.score > 0);
  }

  async similarCars(listingId: string, locale = 'en', limit = 6): Promise<RecommendedListing[]> {
    return this.recommend({ listingId, locale, limit });
  }

  async byBudget(budget: number, currency = 'USD', country?: string, locale = 'en', limit = 8): Promise<RecommendedListing[]> {
    return this.recommend({ budget, currency, country, locale, limit });
  }

  async bySearchHistory(searchHistory: string[], userId?: string, locale = 'en', limit = 8): Promise<RecommendedListing[]> {
    return this.recommend({ searchHistory, userId, locale, limit });
  }

  async byCountry(country: string, locale = 'en', limit = 8): Promise<RecommendedListing[]> {
    return this.recommend({ country, locale, limit });
  }

  async personalised(ctx: RecommendationContext): Promise<RecommendedListing[]> {
    return this.recommend(ctx);
  }
}
