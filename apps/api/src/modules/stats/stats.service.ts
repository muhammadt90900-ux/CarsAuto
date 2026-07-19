// apps/api/src/modules/stats/stats.service.ts
//
// Backs the public marketplace stats shown in the site footer (listings
// count, dealers count, cities count, average rating). Previously these
// were hardcoded strings in the frontend translation files ("24k+", "1.2k+",
// "8", "4.9★") with no data source at all — permanently-fake trust signals
// shown to every visitor regardless of the real numbers.
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CacheService } from '../../common/cache/cache.service';
import { ListingStatus, DealerStatus, ListingType } from '@prisma/client';

const CACHE_KEY = 'public:stats:footer';
const CACHE_TTL_MS = 10 * 60_000; // 10 minutes — these are trust-signal
// aggregate counts, not real-time data; a public, unauthenticated,
// every-page-load endpoint should stay cheap to serve.

const CATEGORY_CACHE_KEY = 'public:stats:categories';
const BRAND_CACHE_KEY = 'public:stats:brands';
const CATEGORY_CACHE_TTL_MS = 10 * 60_000;

export interface PublicStats {
  activeListings: number;
  verifiedDealers: number;
  cities: number;
  averageRating: number;
}

// Backs the homepage "Browse by Category" tiles. Previously each tile had a
// hardcoded count ("4,200+" etc.) with no data source. Only categories with
// an unambiguous, queryable definition are included here — "Luxury" was
// deliberately dropped rather than mapped to an arbitrary/fake proxy, since
// there's no `isLuxury` flag or price-segment definition anywhere in the
// schema. Re-add it once the product defines what "luxury" means (e.g. a
// price threshold, a brand tier, or an explicit tag).
export interface CategoryStats {
  sedan: number;
  suv: number;
  electric: number;
  pickup: number;
  parts: number;
}

// Backs the homepage "Trending Brands" tiles. Keyed by CarBrand.nameEn so
// the frontend can look up by the same name it already renders.
export type BrandStats = Record<string, number>;

@Injectable()
export class StatsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
  ) {}

  async getPublicStats(): Promise<PublicStats> {
    return this.cache.getOrSetWithLock(
      CACHE_KEY,
      () => this.computePublicStats(),
      CACHE_TTL_MS,
    );
  }

  async getCategoryStats(): Promise<CategoryStats> {
    return this.cache.getOrSetWithLock(
      CATEGORY_CACHE_KEY,
      () => this.computeCategoryStats(),
      CATEGORY_CACHE_TTL_MS,
    );
  }

  async getBrandStats(): Promise<BrandStats> {
    return this.cache.getOrSetWithLock(
      BRAND_CACHE_KEY,
      () => this.computeBrandStats(),
      CATEGORY_CACHE_TTL_MS,
    );
  }

  private async computeCategoryStats(): Promise<CategoryStats> {
    const [sedan, suv, electric, pickup, parts] = await Promise.all([
      this.countByBodyType(['SEDAN']),
      this.countByBodyType(['SUV', 'CROSSOVER']),
      this.countByFuelType(['ELECTRIC']),
      this.countByBodyType(['PICKUP_TRUCK']),
      this.prisma.listing.count({
        where: { status: ListingStatus.ACTIVE, type: ListingType.SPARE_PART, deletedAt: null },
      }),
    ]);
    return { sedan, suv, electric, pickup, parts };
  }

  private async countByBodyType(types: string[]): Promise<number> {
    return this.prisma.listing.count({
      where: {
        status: ListingStatus.ACTIVE,
        deletedAt: null,
        vehicleSpec: { bodyType: { in: types as any } },
      },
    });
  }

  private async countByFuelType(types: string[]): Promise<number> {
    return this.prisma.listing.count({
      where: {
        status: ListingStatus.ACTIVE,
        deletedAt: null,
        vehicleSpec: { fuelType: { in: types as any } },
      },
    });
  }

  private async computeBrandStats(): Promise<BrandStats> {
    // Raw query (read replica) — counting active listings grouped by brand
    // name needs a join across listings → listing_vehicle_specs → car_brands
    // that Prisma's typed query builder can't express as a single groupBy
    // (the status/deletedAt filters live on `listings`, the brand name on
    // `car_brands`). Same tagged-template $queryRaw convention already used
    // in search.service.ts — every `${...}` is bound as a parameter, never
    // string-inlined, so this is not susceptible to SQL injection.
    const rows = await this.prisma.db('read').$queryRaw<{ nameEn: string; count: bigint }[]>`
      SELECT cb."nameEn" AS "nameEn", COUNT(*) AS count
      FROM listings l
      JOIN listing_vehicle_specs lvs ON lvs."listingId" = l.id
      JOIN car_brands cb ON cb.id = lvs."brandId"
      WHERE l.status = 'ACTIVE' AND l."deletedAt" IS NULL
      GROUP BY cb."nameEn"
    `;
    const result: BrandStats = {};
    for (const row of rows) {
      result[row.nameEn] = Number(row.count);
    }
    return result;
  }

  private async computePublicStats(): Promise<PublicStats> {
    const [activeListings, verifiedDealers, cityRows, ratingAgg] = await Promise.all([
      this.prisma.listing.count({ where: { status: ListingStatus.ACTIVE } }),
      this.prisma.dealer.count({ where: { status: DealerStatus.VERIFIED } }),
      this.prisma.location.findMany({
        where: { listings: { some: { status: ListingStatus.ACTIVE } } },
        distinct: ['city'],
        select: { city: true },
      }),
      this.prisma.dealer.aggregate({
        where: { status: DealerStatus.VERIFIED, averageRating: { gt: 0 } },
        _avg: { averageRating: true },
      }),
    ]);

    const avg = ratingAgg._avg.averageRating;
    return {
      activeListings,
      verifiedDealers,
      cities: cityRows.length,
      // Fall back to 0 (rendered as "New" / hidden by the frontend) rather
      // than a fake number when there isn't enough review data yet.
      averageRating: avg != null ? Math.round(Number(avg) * 10) / 10 : 0,
    };
  }
}
