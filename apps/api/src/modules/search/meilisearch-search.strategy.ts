// apps/api/src/modules/search/meilisearch-search.strategy.ts
//
// Search Architecture Phase 2: the actual Meilisearch query, isolated from
// search.service.ts's try/fallback orchestration so the two concerns
// (how to ask Meilisearch vs. what to do if it's unavailable) don't get
// tangled in one method.
//
// DESIGN NOTE — why this returns IDs, not full listing documents:
// The Phase 1 Meilisearch document (meilisearch.service.ts's
// ListingDocument) is intentionally lean — it has exactly the fields
// needed for searching/filtering/sorting, not everything a listing card
// needs to render (images, mileageKm, bodyType, negotiable, brand logoUrl,
// etc. are absent). Rather than bloat the index with display-only fields
// that would need re-indexing on every image reorder, this strategy
// returns ranked listing IDs + the total count, and search.service.ts
// hydrates the full records from Postgres via the existing SEARCH_SELECT
// shape — the exact same two-step pattern semanticSearch() already uses
// for its pgvector results. This also means the API's JSON response shape
// is byte-for-byte identical whether it came from Meilisearch or the ILIKE
// fallback, so nothing downstream (frontend, cache keys) needs to know
// which path served a given request.
//
// LOCALE-WEIGHTING LIMITATION: Typesense's query_by_weights lets you
// re-rank searchable fields per-request. Meilisearch's searchable-attribute
// priority order is fixed at the INDEX level (set once in
// meilisearch.service.ts's ensureListingsIndex()), not per-query — the
// `attributesToSearchOn` option below can *restrict* which fields a given
// query considers, but not reorder their relative weight. This strategy
// restricts the field set to prioritize the active locale's title field
// column-order-first is NOT actually possible via this option, so true
// per-locale relevance weighting is deferred: acceptable for now since
// titleKu/titleAr/titleEn/titleZh are all indexed and typo-tolerant
// regardless of locale, and is flagged here as a documented follow-up
// (candidate fix: per-locale Meilisearch indexes, revisited if relevance
// complaints come in for non-Kurdish locales).

import { Injectable, Logger } from '@nestjs/common';
import { MeilisearchService, LISTINGS_INDEX } from '../../common/search-index/meilisearch.service';

export interface MeilisearchQueryResult {
  ids: string[];
  total: number;
  facets: Record<string, { value: string; count: number }[]>;
}

const LOCALE_TITLE_FIELD: Record<string, string> = {
  ku: 'titleKu',
  ar: 'titleAr',
  en: 'titleEn',
  zh: 'titleZh',
};

// Phase 3: same facet field set exposed everywhere facets are requested
// (this file's search() below and facetCounts() further down) — kept as
// one constant so the two never drift apart.
const FACET_FIELDS = ['brandId', 'modelId', 'year', 'fuelType', 'transmission', 'condition', 'featured'];

@Injectable()
export class MeilisearchSearchStrategy {
  private readonly logger = new Logger(MeilisearchSearchStrategy.name);

  constructor(private readonly meilisearch: MeilisearchService) {}

  async search(
    q: string,
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
  ): Promise<MeilisearchQueryResult> {
    const {
      locale, type, brandId, modelId, fuelType, transmission, condition,
      minPrice, maxPrice, minYear, maxYear, lat, lng, radiusKm, page, limit,
    } = options;

    const filters: string[] = ['status = ACTIVE', 'deletedAt IS NULL'];
    if (type)         filters.push(`type = "${type}"`);
    if (brandId)      filters.push(`brandId = "${brandId}"`);
    if (modelId)      filters.push(`modelId = "${modelId}"`);
    if (fuelType)     filters.push(`fuelType = "${fuelType}"`);
    if (transmission) filters.push(`transmission = "${transmission}"`);
    if (condition)    filters.push(`condition = "${condition}"`);
    if (minPrice != null) filters.push(`price >= ${minPrice}`);
    if (maxPrice != null) filters.push(`price <= ${maxPrice}`);
    if (minYear != null)  filters.push(`year >= ${minYear}`);
    if (maxYear != null)  filters.push(`year <= ${maxYear}`);
    // Phase 3: exact geo radius via Meilisearch's native _geoRadius — see
    // ListingsService.buildWhereClause()'s comment for how /listings'
    // Postgres bounding-box approximation differs (this one IS a true
    // circle). All three of lat/lng/radiusKm must be present together.
    if (lat != null && lng != null && radiusKm != null) {
      filters.push(`_geoRadius(${lat}, ${lng}, ${radiusKm * 1000})`); // Meilisearch radius is in meters
    }

    const titleField = locale ? LOCALE_TITLE_FIELD[locale] : undefined;
    const attributesToSearchOn = titleField
      ? [titleField, 'titleKu', 'titleAr', 'titleEn', 'titleZh', 'brandNameEn', 'city']
      : undefined;

    const index = this.meilisearch.getIndex(LISTINGS_INDEX);
    const result = await index.search(q, {
      filter: filters.join(' AND '),
      offset: (page - 1) * limit,
      limit,
      facets: FACET_FIELDS,
      ...(attributesToSearchOn ? { attributesToSearchOn } : {}),
    });

    const distribution = result.facetDistribution ?? {};
    const facets: Record<string, { value: string; count: number }[]> = {};
    for (const [field, counts] of Object.entries(distribution)) {
      facets[field] = Object.entries(counts as Record<string, number>).map(([value, count]) => ({ value, count }));
    }

    return {
      ids: result.hits.map((hit) => hit.id),
      total: result.estimatedTotalHits ?? result.hits.length,
      facets,
    };
  }

  /**
   * Phase 2: lightweight autosuggest — small limit, only the locale's
   * title field returned (not a full hydrate from Postgres like search()
   * above; a dropdown suggestion doesn't need images/spec/etc.).
   */
  async suggest(q: string, locale: string | undefined, limit: number): Promise<string[]> {
    const titleField = (locale && LOCALE_TITLE_FIELD[locale]) || 'titleEn';
    const index = this.meilisearch.getIndex(LISTINGS_INDEX);
    const result = await index.search(q, {
      filter: 'status = ACTIVE AND deletedAt IS NULL',
      limit,
      attributesToRetrieve: [titleField, 'titleEn', 'titleKu'],
    });
    return result.hits
      .map((hit: any) => hit[titleField] || hit.titleEn || hit.titleKu)
      .filter((title: unknown): title is string => typeof title === 'string' && title.length > 0);
  }

  /**
   * Phase 3: facet distribution for the given filters — powers GET
   * /listings/facets (called by the real marketplace pages' filter
   * sidebar, in parallel with their unchanged /listings data request — see
   * search-indexing/README.md's Phase 3 section for why this is a
   * separate endpoint rather than a change to /listings itself).
   *
   * No free-text query — this is a pure "browse with filters" facet pull,
   * so `q` is the empty string (Meilisearch's documented way to match
   * every document, filters still applied).
   */
  async facetCounts(filters: {
    type?: string;
    brandId?: string;
    modelId?: string;
    year?: number;
    minYear?: number;
    maxYear?: number;
    fuelType?: string;
    transmission?: string;
    condition?: string;
    minPrice?: number;
    maxPrice?: number;
  }): Promise<Record<string, { value: string; count: number }[]>> {
    const filterClauses: string[] = ['status = ACTIVE', 'deletedAt IS NULL'];
    if (filters.type)         filterClauses.push(`type = "${filters.type}"`);
    if (filters.brandId)      filterClauses.push(`brandId = "${filters.brandId}"`);
    if (filters.modelId)      filterClauses.push(`modelId = "${filters.modelId}"`);
    if (filters.fuelType)     filterClauses.push(`fuelType = "${filters.fuelType}"`);
    if (filters.transmission) filterClauses.push(`transmission = "${filters.transmission}"`);
    if (filters.condition)    filterClauses.push(`condition = "${filters.condition}"`);
    if (filters.minPrice != null) filterClauses.push(`price >= ${filters.minPrice}`);
    if (filters.maxPrice != null) filterClauses.push(`price <= ${filters.maxPrice}`);
    if (filters.year != null) {
      filterClauses.push(`year = ${filters.year}`);
    } else {
      if (filters.minYear != null) filterClauses.push(`year >= ${filters.minYear}`);
      if (filters.maxYear != null) filterClauses.push(`year <= ${filters.maxYear}`);
    }

    const index = this.meilisearch.getIndex(LISTINGS_INDEX);
    const result = await index.search('', {
      filter: filterClauses.join(' AND '),
      facets: FACET_FIELDS,
      limit: 0, // facet counts only — don't also pay for hit hydration we won't use
    });

    const distribution = result.facetDistribution ?? {};
    const out: Record<string, { value: string; count: number }[]> = {};
    for (const [field, counts] of Object.entries(distribution)) {
      out[field] = Object.entries(counts as Record<string, number>).map(([value, count]) => ({ value, count }));
    }
    return out;
  }
}
