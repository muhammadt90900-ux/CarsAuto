// apps/api/src/modules/ai/ai.service.ts
// AI Recommendation Engine — similar cars, budget, search history, country/locale personalization

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

/* ── Types ──────────────────────────────────────────────────────────────── */

export interface RecommendationContext {
  listingId?: string;       // for "similar cars"
  userId?: string;          // for personalization
  budget?: number;          // explicit budget
  currency?: string;
  country?: string;         // ISO-2 or name, e.g. 'IQ'
  locale?: string;          // 'ku' | 'ar' | 'en'
  searchHistory?: string[]; // recent search terms
  limit?: number;
}

export interface RecommendedListing {
  id: string;
  score: number;             // 0–100 relevance score
  reason: string;            // human-readable reason (localised)
  reasonKey: string;         // machine key: 'similar_car'|'budget'|'search'|'country'|'trending'
  listing: any;
}

/* ── Scoring weights ────────────────────────────────────────────────────── */

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
  similar_car: {
    ku: 'ئۆتۆمبێلی هاوشێوە',
    ar: 'سيارة مماثلة',
    en: 'Similar car',
  },
  budget: {
    ku: 'گونجاوە بۆ بودجەکەت',
    ar: 'مناسب لميزانيتك',
    en: 'Fits your budget',
  },
  search: {
    ku: 'پەیوەندیدارە بە گەڕانەکانت',
    ar: 'يتعلق بعمليات بحثك',
    en: 'Based on your searches',
  },
  country: {
    ku: 'بەناوبانگە لە هەرێمەکەت',
    ar: 'شائع في منطقتك',
    en: 'Popular in your region',
  },
  trending: {
    ku: 'ترێندی ئێستا',
    ar: 'رائج الآن',
    en: 'Trending now',
  },
};

/* ── Country → popular brand IDs mapping ───────────────────────────────── */
// Maintained as simple lookup; extend as DB brands are seeded
const COUNTRY_BRAND_AFFINITY: Record<string, string[]> = {
  IQ: ['toyota', 'kia', 'hyundai', 'nissan', 'honda'],
  SA: ['toyota', 'lexus', 'gmc', 'ford', 'chevrolet'],
  AE: ['bmw', 'mercedes-benz', 'toyota', 'nissan', 'range-rover'],
  TR: ['renault', 'fiat', 'toyota', 'volkswagen', 'ford'],
  IR: ['peugeot', 'renault', 'kia', 'hyundai', 'toyota'],
  DE: ['volkswagen', 'bmw', 'mercedes-benz', 'audi', 'opel'],
  DEFAULT: ['toyota', 'hyundai', 'kia', 'nissan', 'honda'],
};

@Injectable()
export class AiService {
  constructor(private readonly prisma: PrismaService) {}

  /* ── 1. Suggest price (kept from original) ──────────────────────────── */
  async suggestPrice(
    make: string,
    model: string,
    year: number,
    mileage: number,
  ): Promise<number> {
    // Look for comparable sold/active listings to anchor the estimate
    const comparable = await this.prisma.listing
      .findMany({
        where: {
          status: 'ACTIVE',
          vehicleSpec: {
            is: {
              year: { gte: year - 2, lte: year + 2 },
              mileageKm: { lte: mileage + 30_000 },
            },
          },
        },
        select: { price: true },
        take: 20,
      })
      .catch(() => []);

    if (comparable.length >= 3) {
      const prices = comparable.map((l: { price: any }) => Number(l.price)).sort((a: number, b: number) => a - b);
      const mid = Math.floor(prices.length / 2);
      return prices[mid]!; // median of comparable listings
    }

    // Fallback heuristic
    const basePrice = 15_000;
    const agePenalty = (new Date().getFullYear() - year) * 500;
    const mileagePenalty = mileage * 0.01;
    return Math.max(basePrice - agePenalty - mileagePenalty, 1_000);
  }

  /* ── 2. Detect spam (kept from original) ────────────────────────────── */
  async detectSpam(text: string): Promise<boolean> {
    const spamWords = ['scam', 'free money', 'click here', 'guaranteed'];
    return spamWords.some((w) => text.toLowerCase().includes(w));
  }

  /* ── 3. Core recommendation engine ─────────────────────────────────── */
  async recommend(ctx: RecommendationContext): Promise<RecommendedListing[]> {
    const limit = Math.min(ctx.limit ?? 8, 20);
    const locale = ctx.locale ?? 'en';

    // Fetch anchor listing if provided
    const anchor = ctx.listingId
      ? await this.prisma.listing
          .findUnique({
            where: { id: ctx.listingId },
            include: {
              vehicleSpec: {
                include: {
                  brand: true,
                  model: true,
                  trim: true,
                },
              },
              location: true,
            },
          })
          .catch(() => null)
      : null;

    // Resolve candidate pool — active listings, excluding the anchor itself
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
            trim: {
              select: {
                id: true,
                name: true,
                bodyType: true,
                fuelType: true,
                transmission: true,
              },
            },
          },
        },
        user: { select: { id: true, name: true, avatar: true, verified: true } },
      },
      orderBy: [{ featured: 'desc' }, { views: 'desc' }, { createdAt: 'desc' }],
      take: 200, // score within this pool
    });

    // Country brand affinity list
    const countryKey = (ctx.country ?? 'DEFAULT').toUpperCase();
    const preferredBrands: string[] =
      COUNTRY_BRAND_AFFINITY[countryKey] ?? COUNTRY_BRAND_AFFINITY['DEFAULT'] ?? [];

    // Score each candidate
    const scored = candidates.map((listing: any) => {
      let score = 0;
      const reasons: string[] = [];

      const spec = listing.vehicleSpec;
      const anchorSpec = anchor?.vehicleSpec;

      /* Similar car signals */
      if (anchorSpec) {
        if (spec?.brandId === anchorSpec.brandId) {
          score += W.BRAND_MATCH;
          reasons.push('similar_car');
        }
        if (spec?.modelId === anchorSpec.modelId) {
          score += W.MODEL_MATCH;
        }
        if (spec?.trim?.bodyType && spec.trim.bodyType === anchorSpec.trim?.bodyType) {
          score += W.BODY_TYPE_MATCH;
        }
        if (spec?.trim?.fuelType && spec.trim.fuelType === anchorSpec.trim?.fuelType) {
          score += W.FUEL_TYPE_MATCH;
        }
        // Year proximity (within 3 years = full points)
        if (spec?.year && anchorSpec.year) {
          const diff = Math.abs(spec.year - anchorSpec.year);
          if (diff <= 3) score += W.YEAR_PROXIMITY * (1 - diff / 3);
        }
        // Location match
        if (
          listing.locationId &&
          anchor?.locationId &&
          listing.locationId === anchor.locationId
        ) {
          score += W.LOCATION_MATCH;
        }
      }

      /* Budget fit */
      if (ctx.budget && ctx.budget > 0) {
        const budgetMax = ctx.budget * 1.15; // 15% flex
        const budgetMin = ctx.budget * 0.6;
        if (listing.price >= budgetMin && listing.price <= budgetMax) {
          score += W.PRICE_PROXIMITY;
          reasons.push('budget');
        } else if (listing.price <= ctx.budget) {
          score += W.PRICE_PROXIMITY * 0.5;
          reasons.push('budget');
        }
      }

      /* Search history keyword match */
      if (ctx.searchHistory?.length) {
        const searchText = [
          listing.titleEn,
          listing.titleKu,
          listing.titleAr,
          spec?.brand?.name,
          spec?.model?.name,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();

        const hitCount = ctx.searchHistory.filter((term) =>
          searchText.includes(term.toLowerCase()),
        ).length;

        if (hitCount > 0) {
          score += W.SEARCH_KEYWORD * Math.min(hitCount, 2);
          reasons.push('search');
        }
      }

      /* Country / region affinity */
      if (spec?.brand?.name) {
        const brandNameLower = spec.brand.nameEn.toLowerCase();
        const idx = preferredBrands.indexOf(brandNameLower);
        if (idx !== -1) {
          // Top brands get full points, decreasing
          score += W.COUNTRY_POPULARITY * (1 - idx / preferredBrands.length);
          reasons.push('country');
        }
      }

      /* Trending signal — high views relative to recency */
      const ageHours =
        (Date.now() - new Date(listing.createdAt).getTime()) / 3_600_000;
      const viewRate = listing.views / Math.max(ageHours, 1);
      if (viewRate > 0.5) {
        score += W.TRENDING;
        reasons.push('trending');
      }

      // Deduplicate reasons, pick best one
      const uniqueReasons = [...new Set(reasons)];
      const bestReason = uniqueReasons[0] ?? 'trending';

      return {
        id: listing.id,
        score: Math.round(Math.min(score, 100)),
        reason: REASON_LABELS[bestReason]?.[locale] ?? REASON_LABELS[bestReason]?.en ?? '',
        reasonKey: bestReason,
        listing,
      };
    });

    // Sort descending by score, return top N
    return scored
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .filter((r) => r.score > 0);
  }

  /* ── 4. Similar cars (convenience wrapper) ──────────────────────────── */
  async similarCars(
    listingId: string,
    locale = 'en',
    limit = 6,
  ): Promise<RecommendedListing[]> {
    return this.recommend({ listingId, locale, limit });
  }

  /* ── 5. Budget-based recommendations ───────────────────────────────── */
  async byBudget(
    budget: number,
    currency = 'USD',
    country?: string,
    locale = 'en',
    limit = 8,
  ): Promise<RecommendedListing[]> {
    return this.recommend({ budget, currency, country, locale, limit });
  }

  /* ── 6. Search-history-based recommendations ─────────────────────────── */
  async bySearchHistory(
    searchHistory: string[],
    userId?: string,
    locale = 'en',
    limit = 8,
  ): Promise<RecommendedListing[]> {
    return this.recommend({ searchHistory, userId, locale, limit });
  }

  /* ── 7. Country / region trending ───────────────────────────────────── */
  async byCountry(
    country: string,
    locale = 'en',
    limit = 8,
  ): Promise<RecommendedListing[]> {
    return this.recommend({ country, locale, limit });
  }

  /* ── 8. Personalised (combines all signals) ─────────────────────────── */
  async personalised(ctx: RecommendationContext): Promise<RecommendedListing[]> {
    return this.recommend(ctx);
  }
}
