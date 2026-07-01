// apps/api/src/modules/search/search.service.ts
//
// FEATURE 2B: Semantic search via pgvector cosine similarity.
// Falls back to ILIKE when OpenAI is unavailable or embeddings missing.

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CacheService } from '../../common/cache/cache.service';
import { OpenAiService } from '../../common/ai/openai.service';

// ── Cache TTLs ────────────────────────────────────────────────────────────────
const CACHE_TTL_SEARCH        = 30_000;      // 30 s
const CACHE_TTL_SEMANTIC      = 60_000;      // 60 s — shorter: semantic results are dynamic
const CACHE_TTL_AUTOCOMPLETE  = 2 * 60_000;  // 2 min

const MIN_QUERY_LENGTH  = 2;
const SEMANTIC_POOL     = 50;   // candidates from vector search before filtering

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
} as const;

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
    private readonly openai: OpenAiService,
  ) {}

  /* ── Keyword search (ILIKE) ─────────────────────────────────────────────── */

  async search(q: string, options: SearchFilters = {}) {
    const { page = 1, limit = 20, ...filters } = options;

    const normalizedQuery = q?.trim().toLowerCase() ?? '';
    const cacheKey = `search:${normalizedQuery}:${JSON.stringify(filters)}:p${page}:l${limit}`;

    return this.cache.getOrSet(cacheKey, async () => {
      const skip = (page - 1) * limit;
      const where: any = { status: 'ACTIVE', deletedAt: null };

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

      const specWhere: any = {};
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

      // F-ARCH fix: read replica — search.service.ts is entirely read-only,
      // this is exactly the kind of heavy browse/search query replicas exist for.
      const [data, total] = await Promise.all([
        this.prisma.db('read').listing.findMany({
          where,
          skip,
          take: limit,
          orderBy: [{ featured: 'desc' }, { createdAt: 'desc' }],
          select: SEARCH_SELECT,
        }),
        this.prisma.db('read').listing.count({ where }),
      ]);

      return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
    }, CACHE_TTL_SEARCH);
  }

  /* ── Semantic search (pgvector cosine similarity) ─────────────────────── */

  /**
   * Embeds the query, finds the 50 most similar active listings via pgvector,
   * then applies structural filters as a post-filter pass.
   * If OpenAI is unavailable or no embeddings exist, falls back to ILIKE search.
   */
  async semanticSearch(q: string, filters: SearchFilters = {}) {
    const normalizedQuery = q?.trim();
    if (!normalizedQuery || normalizedQuery.length < MIN_QUERY_LENGTH) {
      return this.search(q, filters);
    }

    // Try to get a query embedding
    const embedding = await this.openai.embed(normalizedQuery);

    // No embedding → fall back to keyword search
    if (!embedding.length) {
      return this.search(q, filters);
    }

    const { page = 1, limit = 20, ...structuralFilters } = filters;
    const cacheKey = `search:semantic:${normalizedQuery}:${JSON.stringify(structuralFilters)}:p${page}:l${limit}`;

    return this.cache.getOrSet(cacheKey, async () => {
      // 1. Vector search — get top 50 by cosine similarity
      //    pgvector <=> operator = cosine distance (0=identical, 2=opposite)
      const vectorStr = `[${embedding.join(',')}]`;

      type VectorRow = { id: string; similarity: number };
      // F-CRIT fix: $queryRawUnsafe → $queryRaw tagged template. The previous
      // call already bound `vectorStr` as a parameter rather than
      // interpolating it into the SQL string, but $queryRawUnsafe still
      // accepts a plain string as the query itself, which is an easy place
      // for a future edit to accidentally introduce string concatenation.
      // The tagged-template form makes that structurally impossible — every
      // `${...}` interpolation is parameterized by Prisma, never inlined.
      // F-ARCH fix: read replica — semantic search is read-only.
      const vectorRows = await this.prisma.db('read').$queryRaw<VectorRow[]>`
        SELECT id, 1 - (embedding <=> ${vectorStr}::vector) AS similarity
        FROM listings
        WHERE status = 'ACTIVE'
          AND "deletedAt" IS NULL
          AND embedding IS NOT NULL
        ORDER BY embedding <=> ${vectorStr}::vector
        LIMIT ${SEMANTIC_POOL}
      `;

      if (!vectorRows.length) {
        // No embeddings in DB yet — fall back to keyword search
        return this.search(q, filters);
      }

      const rankedIds = vectorRows.map((r: { id: string; similarity: number }) => r.id);
      const similarityMap = new Map(vectorRows.map((r: { id: string; similarity: number }) => [r.id, r.similarity] as [string, number]));

      // 2. Fetch full listing data for the ranked IDs
      const candidates = await this.prisma.db('read').listing.findMany({
        where: { id: { in: rankedIds } },
        select: SEARCH_SELECT,
      });

      // 3. Apply structural filters as post-filter
      const filtered = candidates.filter((listing: any) => {
        if (structuralFilters.type && listing.type !== structuralFilters.type) return false;
        if (structuralFilters.locationId && listing.locationId !== structuralFilters.locationId) return false;

        const price = Number(listing.price);
        if (structuralFilters.minPrice && price < Number(structuralFilters.minPrice)) return false;
        if (structuralFilters.maxPrice && price > Number(structuralFilters.maxPrice)) return false;

        const spec = listing.vehicleSpec;
        if (spec) {
          if (structuralFilters.brandId && spec.brand?.id !== structuralFilters.brandId) return false;
          if (structuralFilters.modelId && spec.model?.id !== structuralFilters.modelId) return false;
          if (structuralFilters.condition && spec.condition !== structuralFilters.condition) return false;
          if (structuralFilters.fuelType && spec.fuelType !== structuralFilters.fuelType) return false;
          if (structuralFilters.transmission && spec.transmission !== structuralFilters.transmission) return false;
          if (structuralFilters.year && spec.year !== Number(structuralFilters.year)) return false;
        }

        return true;
      });

      // 4. Re-sort by original similarity score (pgvector ordering preserved)
      const sorted = filtered.sort((a: any, b: any) => {
        const simA = similarityMap.get(a.id) ?? 0;
        const simB = similarityMap.get(b.id) ?? 0;
        return simB - simA;
      });

      // 5. Paginate
      const skip = (page - 1) * limit;
      const data = sorted.slice(skip, skip + limit);
      const total = sorted.length;

      return { data, total, page, limit, totalPages: Math.ceil(total / limit), semantic: true };
    }, CACHE_TTL_SEMANTIC);
  }

  /* ── Autocomplete ───────────────────────────────────────────────────────── */

  /**
   * FEATURE 2B improvement: UNION with CarBrand + CarModel tables
   * so autocomplete suggests "Toyota Camry" even before users type much.
   */
  async autocomplete(q: string, limit = 6): Promise<string[]> {
    if (!q || q.trim().length < MIN_QUERY_LENGTH) return [];

    const term = q.trim().toLowerCase();
    const cacheKey = `search:autocomplete:${term}`;

    return this.cache.getOrSet(cacheKey, async () => {
      // Union 3 sources: listing titles + brand names + model names
      // F-ARCH fix: read replica — autocomplete is read-only.
      const rows = await this.prisma.db('read').$queryRaw<{ suggestion: string; rank: number }[]>`
        SELECT suggestion, rank FROM (
          -- Source 1: listing titles (highest relevance)
          SELECT DISTINCT
            COALESCE("titleEn", "titleKu") AS suggestion,
            1 AS rank
          FROM listings
          WHERE status = 'ACTIVE'
            AND "deletedAt" IS NULL
            AND (
              LOWER("titleEn") LIKE ${'%' + term + '%'}
              OR LOWER("titleKu") LIKE ${'%' + term + '%'}
            )
          LIMIT ${limit}

          UNION

          -- Source 2: brand names (match on nameEn or nameKu)
          SELECT DISTINCT
            "nameEn" AS suggestion,
            2 AS rank
          FROM car_brands
          WHERE
            LOWER("nameEn") LIKE ${'%' + term + '%'}
            OR LOWER("nameKu") LIKE ${'%' + term + '%'}
          LIMIT ${Math.ceil(limit / 2)}

          UNION

          -- Source 3: brand + model combination
          SELECT DISTINCT
            (b."nameEn" || ' ' || m."nameEn") AS suggestion,
            3 AS rank
          FROM car_models m
          JOIN car_brands b ON m."brandId" = b.id
          WHERE
            LOWER(m."nameEn") LIKE ${'%' + term + '%'}
            OR LOWER(b."nameEn" || ' ' || m."nameEn") LIKE ${'%' + term + '%'}
          LIMIT ${Math.ceil(limit / 2)}
        ) combined
        ORDER BY rank, suggestion
        LIMIT ${limit}
      `;

      return rows.map((r: any) => r.suggestion).filter(Boolean);
    }, CACHE_TTL_AUTOCOMPLETE);
  }
}
