// apps/api/src/modules/search-indexing/search-index.constants.ts
//
// Shared between the producer side (this module + admin.service.ts's
// full-reindex endpoint, both in apps/api) and the consumer side
// (apps/worker/src/processors/search-index.processor.ts). Keep both ends
// in sync if either changes — there is no shared package for this yet
// (see search-index.processor.ts's header comment).

export const SEARCH_INDEX_QUEUE = 'search-index';

export type SearchIndexAction = 'upsert' | 'delete';

export interface SearchIndexJobData {
  action: SearchIndexAction;
  listingId: string;
}

// Admin full-reindex endpoint pagination — batch size chosen to keep a
// single page's worth of listings comfortably in memory while still being
// large enough that reindexing ~100k listings doesn't take an excessive
// number of round trips.
export const REINDEX_BATCH_SIZE = 500;
