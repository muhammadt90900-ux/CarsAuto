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
import { ListingStatus, DealerStatus } from '@prisma/client';

const CACHE_KEY = 'public:stats:footer';
const CACHE_TTL_MS = 10 * 60_000; // 10 minutes — these are trust-signal
// aggregate counts, not real-time data; a public, unauthenticated,
// every-page-load endpoint should stay cheap to serve.

export interface PublicStats {
  activeListings: number;
  verifiedDealers: number;
  cities: number;
  averageRating: number;
}

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
