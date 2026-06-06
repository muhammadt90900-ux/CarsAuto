// apps/api/src/modules/search/search.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CacheService } from '../../common/cache/cache.service';
import { Prisma } from '@prisma/client';

// ── Cache TTLs ────────────────────────────────────────────────────────────────
const CACHE_TTL_SEARCH       = 30_000;      // 30 s
const CACHE_TTL_AUTOCOMPLETE = 2 * 60_000;  // 2 min

// Minimum query length to prevent scanning the full table
const MIN_QUERY_LENGTH = 2;

// ── Lean select — no description blobs ───────────────────────────────────────
const SEARCH_SELECT = {
  id: true, type: true,
  titleKu: true, titleAr: true, titleEn: true,
  price: true, currency: true, negotiable: true,
  featured: true, createdAt: true,
  images: { where: { isCover: true }, take: 1, select: { url: true } },
  location: { select: { city: true, nameKu: true, nameEn: true } },
  vehicleSpec: {
    select: {
      year: true, mileageKm: true, fuelType: true,
      transmission: true, bodyType: true, condition: true,
      brand: { select: { nameEn: true, nameKu: true, logoUrl: true } },
      model: { select: { nameEn: true, nameKu: true } },
    },
  },
} satisfies Prisma.ListingSelect;

// ── Types ─────────────────────────────────────────────────────────────────────
export interface SearchFilters {
  type?: string;
  brandId?: string;
  modelId?: string;
  trimId?: string;
  year?: string;
  minYear?: string;
  maxYear?: string;
  condition?: string;
  minPrice?: string;
  maxPrice?: string;
  locationId?: string;
  fuelType?: string;
  transmission?: string;
  color?: string;
  minMileage?: string;
  maxMileage?: string;
  page?: number;
  limit?: number;
}

const DIRECT_SPEC_FIELDS = [
  'brandId', 'modelId', 'trimId',
  'condition', 'fuelType', 'transmission',
] as const;

@Injectable()
export class SearchService {
  [x: string]: any;
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
  ) {}

  async search(q: string, options: SearchFilters = {}) {
    const { page = 1, limit = 20, ...filters } = options;

    // Normalise query — "Toyota" and "toyota" share the same cache entry
    const normalizedQuery = q?.trim().toLowerCase() ?? '';
    const cacheKey = `search:${normalizedQuery}:${JSON.stringify(filters)}:p${page}:l${limit}`;

    return this.cache.getOrSet(cacheKey, async () => {
      const skip = (page - 1) * limit;
      const where: Prisma.ListingWhereInput = { status: 'ACTIVE' };

      if (normalizedQuery.length >= MIN_QUERY_LENGTH) {
        where.OR = [
          { titleEn: { contains: normalizedQuery, mode: 'insensitive' } },
          { titleKu: { contains: normalizedQuery, mode: 'insensitive' } },
          { titleAr: { contains: normalizedQuery, mode: 'insensitive' } },
        ];
      }

      if (filters.type)       where.type       = filters.type as any;
      if (filters.locationId) where.locationId = filters.locationId;

      if (filters.minPrice || filters.maxPrice) {
        where.price = {
          ...(filters.minPrice ? { gte: Number(filters.minPrice) } : {}),
          ...(filters.maxPrice ? { lte: Number(filters.maxPrice) } : {}),
        };
      }

      const specWhere: Prisma.ListingVehicleSpecWhereInput = {};
      let hasSpecFilter = false;

      for (const field of DIRECT_SPEC_FIELDS) {
        if ((filters as any)[field]) {
          (specWhere as any)[field] = (filters as any)[field];
          hasSpecFilter = true;
        }
      }

      if (filters.color) {
        specWhere.color = { equals: filters.color, mode: 'insensitive' };
        hasSpecFilter = true;
      }

      if (filters.year) {
        specWhere.year = Number(filters.year);
        hasSpecFilter = true;
      } else if (filters.minYear || filters.maxYear) {
        specWhere.year = {
          ...(filters.minYear ? { gte: Number(filters.minYear) } : {}),
          ...(filters.maxYear ? { lte: Number(filters.maxYear) } : {}),
        };
        hasSpecFilter = true;
      }

      if (filters.minMileage || filters.maxMileage) {
        specWhere.mileageKm = {
          ...(filters.minMileage ? { gte: Number(filters.minMileage) } : {}),
          ...(filters.maxMileage ? { lte: Number(filters.maxMileage) } : {}),
        };
        hasSpecFilter = true;
      }

      if (hasSpecFilter) where.vehicleSpec = { is: specWhere };

      const [data, total] = await Promise.all([
        this.prisma.listing.findMany({
          where,
          skip,
          take: limit,
          orderBy: [{ featured: 'desc' }, { createdAt: 'desc' }],
          select: SEARCH_SELECT,
        }),
        this.prisma.listing.count({ where }),
      ]);

      return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
    }, CACHE_TTL_SEARCH);
  }

  async autocomplete(q: string, limit = 6): Promise<string[]> {
    if (!q || q.trim().length < MIN_QUERY_LENGTH) return [];

    const term = q.trim().toLowerCase();
    const cacheKey = `search:autocomplete:${term}`;

    return this.cache.getOrSet(cacheKey, async () => {
      // DISTINCT at DB level — cheaper than Prisma's client-side distinct.
      // Only queries indexed title columns, not description blobs.
      const rows = await this.prisma.$queryRaw<{ title: string }[]>`
        SELECT DISTINCT COALESCE("titleEn", "titleKu") AS title
        FROM "Listing"
        WHERE status = 'ACTIVE'
          AND (
            LOWER("titleEn") LIKE ${'%' + term + '%'}
            OR LOWER("titleKu") LIKE ${'%' + term + '%'}
          )
        LIMIT ${limit}
      `;
      return rows.map((r) => r.title).filter(Boolean);
    }, CACHE_TTL_AUTOCOMPLETE);
  }
}
