// apps/worker/src/common/search-index/meilisearch.service.ts
// (copied from apps/api/src/common/search-index/meilisearch.service.ts —
// keep both in sync until this is extracted into a shared package; same
// duplication convention already used for translation.processor.ts, see
// that file's header comment for the rationale.)
//
// Worker-side needs are narrower than the API's: only document
// upsert/delete (the actual indexing work). Index creation/settings are
// owned by the API side (apps/api/src/common/search-index/meilisearch.service.ts's
// ensureListingsIndex(), run on API boot) — the worker never creates or
// reconfigures the index, only writes documents into it.

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MeiliSearch } from 'meilisearch';

export const LISTINGS_INDEX = 'listings';

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
  deletedAt: number | null;
  // Search Architecture Phase 4 — see apps/api's copy of this interface
  // for the full comment.
  rankingScore: number;
}

@Injectable()
export class MeilisearchService implements OnModuleInit {
  private readonly logger = new Logger(MeilisearchService.name);
  private client!: MeiliSearch;

  constructor(private readonly config: ConfigService) {}

  onModuleInit() {
    this.client = new MeiliSearch({
      host: this.config.get<string>('MEILISEARCH_URL', 'http://localhost:7700'),
      apiKey: this.config.get<string>('MEILISEARCH_API_KEY'),
    });
  }

  private index() {
    return this.client.index<ListingDocument>(LISTINGS_INDEX);
  }

  async upsertDocument(doc: ListingDocument): Promise<void> {
    await this.index().addDocuments([doc], { primaryKey: 'id' });
  }

  async deleteDocument(id: string): Promise<void> {
    await this.index().deleteDocument(id);
  }

  /** Search Architecture Phase 5: used by search-consistency-check.processor.ts's drift check. */
  async getDocumentCount(): Promise<number> {
    const stats = await this.index().getStats();
    return stats.numberOfDocuments;
  }

  /** Search Architecture Phase 5: used by search-consistency-check.processor.ts's spot-check. Returns null if the document doesn't exist (never throws for a 404). */
  async getDocument(id: string): Promise<ListingDocument | null> {
    try {
      const doc = await this.index().getDocument(id);
      return doc as ListingDocument;
    } catch {
      return null;
    }
  }
}