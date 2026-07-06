// apps/api/src/modules/search/search.service.ts
//
// FEATURE 2B: Semantic search via pgvector cosine similarity.
// Falls back to ILIKE when OpenAI is unavailable or embeddings missing.

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CacheService } from '../../common/cache/cache.service';
import { OpenAiService } from '../../common/ai/openai.service';
import { MeilisearchSearchStrategy } from './meilisearch-search.strategy';

// ── Cache TTLs ────────────────────────────────────────────────────────────────
const CACHE_TTL_SEARCH        = 30_000;      // 30 s
const CACHE_TTL_SEMANTIC      = 60_000;      // 60 s — shorter: semantic results are dynamic
const CACHE_TTL_AUTOCOMPLETE  = 2 * 60_000;  // 2 min
const CACHE_TTL_SUGGEST       = 2 * 60_000;  // 2 min — Phase 2 /search/suggest
const MEILISEARCH_TIMEOUT_MS  = 800;         // Phase 2: fall back to ILIKE past this

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
  locale?: string; // Phase 2: passed through to the Meilisearch strategy
  // Phase 3: geo radius search — Meilisearch's native `_geoRadius`, exact
  // (unlike /listings' bounding-box approximation — see
  // ListingsService.buildWhereClause()'s geo comment for that tradeoff).
  lat?: number;
  lng?: number;
  radiusKm?: number;
}

const DIRECT_SPEC_FIELDS = [
  'brandId', 'modelId', 'trimId',
  'condition', 'fuelType', 'transmission',
] as const;

@Injectable()
export class SearchService {
  [x: string]: any;
  private readonly logger = new Logger(SearchService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
    private readonly openai: OpenAiService,
    private readonly meilisearchStrategy: MeilisearchSearchStrategy,
    private readonly config: ConfigService,
  ) {}

  /* ── Keyword search (ILIKE) ─────────────────────────────────────────────── */

  async search(q: string, options: SearchFilters = {}) {
    const { page = 1, limit = 20, locale, ...filters } = options;

    const normalizedQuery = q?.trim().toLowerCase() ?? '';
    const cacheKey = `search:${normalizedQuery}:${JSON.stringify(filters)}:p${page}:l${limit}`;

    // F-PERF fix: getOrSetWithLock (not plain getOrSet) — see cache.service
    // .ts's header comment on that method for why (stampede protection on
    // hot, short-TTL read caches).
    const result = await this.cache.getOrSetWithLock(cacheKey, async () => {
      // Phase 2: SEARCH_ENGINE_MODE=postgres is the instant, no-deploy
      // rollback switch (see search-indexing/README.md's rollback notes) —
      // flip the env var and restart to bypass Meilisearch entirely.
      const engineMode = this.config.get<string>('SEARCH_ENGINE_MODE', 'meilisearch');

      if (engineMode !== 'postgres' && normalizedQuery.length >= MIN_QUERY_LENGTH) {
        const meiliResult = await this.tryMeilisearch(normalizedQuery, {
          locale,
          type: filters.type,
          locationId: filters.locationId,
          brandId: filters.brandId,
          modelId: filters.modelId,
          fuelType: filters.fuelType,
          transmission: filters.transmission,
          condition: filters.condition,
          minPrice: filters.minPrice ? Number(filters.minPrice) : undefined,
          maxPrice: filters.maxPrice ? Number(filters.maxPrice) : undefined,
          minYear: filters.minYear ? Number(filters.minYear) : undefined,
          maxYear: filters.maxYear ? Number(filters.maxYear) : undefined,
          lat: filters.lat,
          lng: filters.lng,
          radiusKm: filters.radiusKm,
          page,
          limit,
        });
        if (meiliResult) return meiliResult;
        // Falls through to the ILIKE path below on timeout/error — already
        // logged a warning inside tryMeilisearch().
      }

      return this.searchPostgres(normalizedQuery, filters, page, limit);
    }, CACHE_TTL_SEARCH);

    // Phase 2: search query tracking — fire-and-forget, never blocks or
    // fails the response. Powers Phase 4's trending searches later.
    // Only track non-empty queries (empty q = browse, not search).
    if (normalizedQuery.length >= MIN_QUERY_LENGTH) {
      this.trackSearchEvent(normalizedQuery, locale, result.total).catch(() => {});
    }

    return result;
  }

  /**
   * Phase 2: queries Meilisearch for ranked listing IDs, then hydrates the
   * full records from Postgres (SEARCH_SELECT) preserving Meilisearch's
   * order — see meilisearch-search.strategy.ts's header comment for why.
   * Returns null (never throws) on timeout or any error, signalling the
   * caller to fall back to the ILIKE path.
   */
  private async tryMeilisearch(
    normalizedQuery: string,
    options: {
      locale?: string;
      type?: string;
      locationId?: string;
      brandId?: string;
      modelId?: string;
      fuelType?: string;
      transmission?: string;
      condition?: string;
      minPrice?: number;
      maxPrice?: number;
      minYear?: number;
      maxYear?: number;
      lat?: number;
      lng?: number;
      radiusKm?: number;
      page: number;
      limit: number;
    },
  ): Promise<{ data: any[]; total: number; page: number; limit: number; totalPages: number; facets: Record<string, { value: string; count: number }[]> } | null> {
    try {
      const timeout = new Promise<null>((resolve) =>
        setTimeout(() => resolve(null), MEILISEARCH_TIMEOUT_MS),
      );
      const query = this.meilisearchStrategy.search(normalizedQuery, options);
      const result = await Promise.race([query, timeout]);

      if (!result) {
        this.logger.warn(`Meilisearch search timed out after ${MEILISEARCH_TIMEOUT_MS}ms — falling back to Postgres`);
        return null;
      }

      if (!result.ids.length) {
        return { data: [], total: result.total, page: options.page, limit: options.limit, totalPages: 0, facets: result.facets };
      }

      // locationId isn't a Meilisearch filter yet (city/governorate/country
      // are, but not the locationId FK itself) — applied as a Postgres
      // post-filter here so it isn't silently ignored if a caller passes it.
      const rows = await this.prisma.db('read').listing.findMany({
        where: {
          id: { in: result.ids },
          ...(options.locationId ? { locationId: options.locationId } : {}),
        },
        select: SEARCH_SELECT,
      });
      const byId = new Map(rows.map((r: any) => [r.id, r]));
      const data = result.ids.map((id) => byId.get(id)).filter(Boolean);

      return {
        data,
        total: result.total,
        page: options.page,
        limit: options.limit,
        totalPages: Math.ceil(result.total / options.limit),
        facets: result.facets,
      };
    } catch (err) {
      this.logger.warn(`Meilisearch search failed — falling back to Postgres: ${(err as Error).message}`);
      return null;
    }
  }

  /** The original ILIKE keyword search — now the fallback path, logic otherwise unchanged. */
  private async searchPostgres(normalizedQuery: string, filters: Omit<SearchFilters, 'page' | 'limit' | 'locale'>, page: number, limit: number) {
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
      // Phase 3: lat/lng/radiusKm geo search has no ILIKE-fallback
      // equivalent here — it's silently dropped if Meilisearch is down.
      // Acceptable: this only affects the "near me" toggle during a
      // Meilisearch outage, and the alternative (adding a Postgres
      // bounding-box filter to this rarely-hit fallback path too) adds
      // maintenance surface for a degraded-mode-only feature.

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

      // Phase 3: no facet counts on the ILIKE fallback path — computing
      // per-field GROUP BY counts here would mean N extra Postgres queries
      // on every fallback request, which defeats the point of a fast
      // fallback. Acceptable degradation: this path only runs when
      // Meilisearch is down/timing out, and the frontend renders filters
      // without counts rather than erroring (see HeroSearch.tsx-equivalent
      // handling in the marketplace filter sidebar).
      return { data, total, page, limit, totalPages: Math.ceil(total / limit), facets: {} };
  }

  /** Phase 2: fire-and-forget write to search_events — never blocks/fails the search response. */
  private async trackSearchEvent(query: string, locale: string | undefined, resultCount: number, userId?: string): Promise<void> {
    await this.prisma.searchEvent.create({
      data: { query, locale: locale ?? 'ku', resultCount, userId: userId ?? null },
    });
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

    // F-PERF fix: getOrSetWithLock (not plain getOrSet) — see cache.service
    // .ts's header comment on that method for why (stampede protection on
    // hot, short-TTL read caches).
    return this.cache.getOrSetWithLock(cacheKey, async () => {
      // 1. Vector search — get top 50 by cosine similarity
      //    pgvector <=> operator = cosine distance (0=identical, 2=opposite)
      const vectorStr = `[${embedding.join(',')}]`;

      type VectorRow = { id: string; similarity: number };
      // SEC-AUDIT (2026-07-03): confirmed no queryRawUnsafe / string-built SQL
      // remains in this file — every raw query below uses Prisma's $queryRaw
      // tagged-template syntax, where each `${...}` is bound as a parameter
      // by Prisma and never inlined into the SQL text.
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

  /* ── Autosuggest (Phase 2) ──────────────────────────────────────────────── */

  /**
   * Search Architecture Phase 2: implements SearchService.suggestions(),
   * which search.controller.ts's GET /search/suggestions has been calling
   * since before this phase — but the method never existed on this class.
   * It compiled anyway because of the `[x: string]: any` index signature
   * at the top of this class, so the route was silently throwing
   * "searchService.suggestions is not a function" (a 500) at runtime.
   * This phase's autosuggest requirement fixes it for real, backed by
   * Meilisearch with a fallback to the existing SQL-based autocomplete().
   */
  async suggestions(q: string, locale?: string, limit = 8): Promise<string[]> {
    if (!q || q.trim().length < MIN_QUERY_LENGTH) return [];

    const term = q.trim();
    const cacheKey = `search:suggest:${locale ?? 'ku'}:${term.toLowerCase()}`;

    return this.cache.getOrSetWithLock(cacheKey, async () => {
      const engineMode = this.config.get<string>('SEARCH_ENGINE_MODE', 'meilisearch');

      if (engineMode !== 'postgres') {
        try {
          const timeout = new Promise<null>((resolve) =>
            setTimeout(() => resolve(null), MEILISEARCH_TIMEOUT_MS),
          );
          const suggestions = await Promise.race([
            this.meilisearchStrategy.suggest(term, locale, limit),
            timeout,
          ]);
          if (suggestions) return suggestions;
          this.logger.warn(`Meilisearch suggest timed out after ${MEILISEARCH_TIMEOUT_MS}ms — falling back`);
        } catch (err) {
          this.logger.warn(`Meilisearch suggest failed — falling back: ${(err as Error).message}`);
        }
      }

      return this.autocomplete(term, limit);
    }, CACHE_TTL_SUGGEST);
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

    // F-PERF fix: getOrSetWithLock (not plain getOrSet) — see cache.service
    // .ts's header comment on that method for why (stampede protection on
    // hot, short-TTL read caches).
    return this.cache.getOrSetWithLock(cacheKey, async () => {
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
