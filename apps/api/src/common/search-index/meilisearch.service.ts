// apps/api/src/common/search-index/meilisearch.service.ts
//
// Search Architecture Phase 1: thin wrapper around the Meilisearch Node
// client. This is intentionally "dumb" — connection + index/schema setup +
// document CRUD only. No query-building or ranking logic lives here; that
// belongs to typesense-search.strategy.ts's Meilisearch equivalent in
// Phase 2 and ranking.service.ts in Phase 4.
//
// WHY MEILISEARCH INSTEAD OF TYPESENSE: docker-compose.yml already runs a
// `meilisearch` container (getmeili/meilisearch:v1.10, healthchecked, on the
// internal network) — it was provisioned at some point but nothing in the
// codebase ever talked to it. Meilisearch covers every requirement in this
// plan (typo-tolerant multilingual search, faceting with live counts, geo
// radius search, custom ranking rules) so this phase wires up the
// already-running instance instead of standing up a second search engine
// side-by-side. If Typesense is ever specifically required later, this file
// is the only place that needs to change — everything downstream talks to
// MeilisearchService's methods, not the Meilisearch client directly.
//
// Both `api` and `worker` need their own instance of this wrapper (separate
// Node processes, separate connections) — apps/worker/src/common/search-index/
// meilisearch.service.ts is a deliberate copy, same pattern already used for
// TranslationProcessor (see that file's header comment). Keep the two in
// sync until/unless this is extracted into a shared package.

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MeiliSearch, type Index } from 'meilisearch';

export const LISTINGS_INDEX = 'listings';

// Fields a client is allowed to filter/facet on. Keep in sync with the
// `facet: true` fields called out in the phase plan: brandId, modelId,
// year, fuelType, transmission, condition, city, currency, featured — plus
// the fields Phase 1's own pipeline needs to filter on internally
// (status, deletedAt) that are not user-facing facets.
const FILTERABLE_ATTRIBUTES = [
  'status',
  'deletedAt',
  'type',
  'brandId',
  'modelId',
  'year',
  'fuelType',
  'transmission',
  'condition',
  'city',
  'governorate',
  'country',
  'currency',
  'featured',
  'dealerVerified',
  '_geo',
];

const SORTABLE_ATTRIBUTES = ['price', 'year', 'createdAt', 'rankingScore', '_geo'];

// Meilisearch searches every field with `searchableAttributes: ['*']` by
// default; we instead list them explicitly, in priority order (Meilisearch
// treats earlier entries as higher-weighted), so the locale-aware boosting
// Phase 2 needs (query_by_weights equivalent) has a well-defined base to
// start from.
const SEARCHABLE_ATTRIBUTES = [
  'titleKu',
  'titleAr',
  'titleEn',
  'titleZh',
  'brandNameEn',
  'brandNameKu',
  'brandNameAr',
  'modelNameEn',
  'city',
];

export interface ListingDocument {
  id: string;
  type: string;
  status: string;
  titleKu: string;
  titleAr: string;
  titleEn: string;
  titleZh: string;
  price: number;
  currency: string;
  brandId: string | null;
  brandNameEn: string | null;
  brandNameKu: string | null;
  brandNameAr: string | null;
  modelId: string | null;
  modelNameEn: string | null;
  year: number | null;
  fuelType: string | null;
  transmission: string | null;
  condition: string | null;
  locationId: string | null;
  city: string | null;
  governorate: string | null;
  country: string | null;
  _geo: { lat: number; lng: number } | null;
  featured: boolean;
  dealerId: string | null;
  dealerVerified: boolean;
  createdAt: number; // unix seconds
  deletedAt: number | null; // unix seconds — used to filter, not display
  // Search Architecture Phase 4: secondary sort tiebreaker — see
  // ensureListingsIndex()'s rankingRules and common/ranking/ranking-formula.ts.
  rankingScore: number;
}

@Injectable()
export class MeilisearchService implements OnModuleInit {
  private readonly logger = new Logger(MeilisearchService.name);
  private client!: MeiliSearch;

  constructor(private readonly config: ConfigService) {}

  async onModuleInit() {
    this.client = new MeiliSearch({
      host: this.config.get<string>('MEILISEARCH_URL', 'http://localhost:7700'),
      apiKey: this.config.get<string>('MEILISEARCH_API_KEY'),
    });
    // Idempotent — safe on every boot/every replica. Non-fatal on failure
    // (see ensureListingsIndex()'s own try/catch) so a Meilisearch outage
    // never prevents the API itself from starting.
    await this.ensureListingsIndex();
  }

  /** Raw client escape hatch for later phases (Phase 2's search strategy needs `.search()`/`.multiSearch()`). */
  getClient(): MeiliSearch {
    return this.client;
  }

  getIndex(indexUid: string = LISTINGS_INDEX): Index<ListingDocument> {
    return this.client.index<ListingDocument>(indexUid);
  }

  async healthCheck(): Promise<boolean> {
    try {
      const health = await this.client.health();
      return health.status === 'available';
    } catch (err) {
      this.logger.warn(`Meilisearch health check failed: ${(err as Error).message}`);
      return false;
    }
  }

  /**
   * Idempotent — safe to call on every boot. Creates the `listings` index
   * (if missing) and (re)applies searchable/filterable/sortable settings.
   * Meilisearch settings updates are themselves idempotent/incremental, so
   * this never wipes existing documents.
   */
  async ensureListingsIndex(): Promise<void> {
    try {
      const existing = await this.client.getIndexes({ limit: 1 });
      const alreadyExists = existing.results.some((idx) => idx.uid === LISTINGS_INDEX);

      if (!alreadyExists) {
        const task = await this.client.createIndex(LISTINGS_INDEX, { primaryKey: 'id' });
        await this.client.waitForTask(task.taskUid);
        this.logger.log(`Created Meilisearch index "${LISTINGS_INDEX}"`);
      }

      const index = this.getIndex();
      await index.updateSettings({
        searchableAttributes: SEARCHABLE_ATTRIBUTES,
        filterableAttributes: FILTERABLE_ATTRIBUTES,
        sortableAttributes: SORTABLE_ATTRIBUTES,
        typoTolerance: {
          enabled: true,
          minWordSizeForTypos: { oneTypo: 4, twoTypos: 8 },
        },
        // Search Architecture Phase 4: text-relevance rules first (same
        // five Meilisearch ships by default, minus its own generic
        // "sort"/"exactness" tail), then our two explicit tiebreakers —
        // rankingScore (freshness/featured/dealer-trust/CTR composite,
        // see common/ranking/ranking-formula.ts) beats plain recency,
        // createdAt is the final tiebreaker for anything still tied.
        rankingRules: [
          'words',
          'typo',
          'proximity',
          'attribute',
          'exactness',
          'rankingScore:desc',
          'createdAt:desc',
        ],
      });
      this.logger.log(`Applied settings to Meilisearch index "${LISTINGS_INDEX}"`);
    } catch (err) {
      // Non-fatal — Phase 1 must not block API boot if Meilisearch is
      // temporarily unreachable. The dual-write pipeline degrades to
      // "jobs enqueue, processor retries" until it comes back.
      this.logger.error(`Failed to ensure Meilisearch index/settings: ${(err as Error).message}`);
    }
  }

  async upsertDocument(doc: ListingDocument): Promise<void> {
    await this.getIndex().addDocuments([doc], { primaryKey: 'id' });
  }

  async upsertDocuments(docs: ListingDocument[]): Promise<void> {
    if (!docs.length) return;
    await this.getIndex().addDocuments(docs, { primaryKey: 'id' });
  }

  async deleteDocument(id: string): Promise<void> {
    await this.getIndex().deleteDocument(id);
  }

  /** Used by Phase 2's pre-cutover count-comparison check and Phase 5's nightly consistency job. */
  async getDocumentCount(): Promise<number> {
    const stats = await this.getIndex().getStats();
    return stats.numberOfDocuments;
  }
}
