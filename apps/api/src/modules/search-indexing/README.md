# Search Indexing — Dual-Write Pipeline (Phase 1)

Infra + pipeline only. **Nothing reads from Meilisearch yet** — the live
search read path is still `apps/api/src/modules/search/search.service.ts`'s
ILIKE/pgvector queries against Postgres. This phase's only job is to keep
a Meilisearch `listings` index correctly populated in parallel, so Phase 2
can cut reads over to it with confidence.

## Why Meilisearch, not Typesense

`docker-compose.yml` already runs a `meilisearch` container — provisioned
at some point, never wired up to any code. Meilisearch covers everything
this phased plan needs (typo-tolerant multilingual search, faceting with
live counts, geo radius search, custom ranking), so this phase indexes
into the already-running instance instead of standing up Typesense
alongside it. Every read/write goes through `MeilisearchService`
(`apps/api/src/common/search-index/meilisearch.service.ts` and its worker
copy) — if a different engine is ever required later, that's the only
file that needs to change.

## Flow

```
ListingsService (create/update/sold/delete)
        │ emits domain event
        ▼
SearchIndexListener (apps/api/src/modules/search-indexing/)
        │ enqueues { action, listingId } — never calls Meilisearch directly
        ▼
BullMQ queue: "search-index"
        │
        ▼
SearchIndexProcessor (apps/worker/src/processors/search-index.processor.ts)
        │ loads the listing, builds the Meilisearch document, upserts/deletes
        ▼
Meilisearch "listings" index
```

- **Producers** (enqueue jobs, never touch Meilisearch directly):
  - `SearchIndexListener` — reacts to `listing.created` / `listing.updated`
    / `listing.sold` (all → `upsert`) and `listing.deleted` (→ `delete`).
  - `AdminService.triggerSearchReindex()` — bulk producer for backfills.
- **Consumer** (the only thing that talks to Meilisearch for writes):
  - `SearchIndexProcessor` in `apps/worker`.
- **Index/schema owner**: `apps/api`'s `MeilisearchService.ensureListingsIndex()`,
  run idempotently on every API boot. The worker only ever upserts/deletes
  documents — it never creates the index or changes its settings.

`ListingUpdatedEvent` (new in this phase — see `common/events/listing.events.ts`)
is emitted from every `listings.service.ts` code path that can change a
searchable field: `update()` (title/price/status/spec/location) and the
async spam-quarantine status flip inside `create()`. It is **not** emitted
from `create()`'s main success path (`ListingCreatedEvent` already covers
that) or from the soft-delete path in `delete()` (`ListingDeletedEvent`
already covers that).

## Running a full reindex

```
POST /admin/search/reindex
```

(Requires an authenticated admin — same `JwtAuthGuard` + `AdminGuard` as
every other `/admin/*` route.)

Paginates every `ACTIVE`, non-deleted listing in batches of 500 (cursor-based,
not offset — see `REINDEX_BATCH_SIZE` in `search-index.constants.ts`) and
enqueues an `upsert` job for each. Returns immediately with
`{ queued: <count> }` — the actual indexing happens asynchronously as the
worker drains the queue, so a large catalog will take a little while to
finish after this call returns. There is currently no endpoint to check
reindex completion; Phase 5 adds a scheduled Postgres-vs-Meilisearch
document-count consistency check that would catch a stalled reindex.

Run this once after deploying Phase 1 to backfill the index for the first
time, and any time you suspect the index has drifted from Postgres before
Phase 5's automated drift detection exists.

## Phase 2 — reading from Meilisearch

`GET /search/listings` and `GET /search/suggestions` now query Meilisearch
first (`MeilisearchSearchStrategy`, in `apps/api/src/modules/search/`),
falling back to the original ILIKE/raw-SQL implementation on timeout
(800ms, `MEILISEARCH_TIMEOUT_MS`) or any error. `SearchService.search()`
only returns *IDs* from Meilisearch and hydrates full listing rows from
Postgres — see `meilisearch-search.strategy.ts`'s header comment for why —
so the JSON shape returned to clients is identical regardless of which
path served the request.

**Rollback**: set `SEARCH_ENGINE_MODE=postgres` (env var, on both the
docker-compose `api` service and the k8s configmap) and restart — this
forces every search back onto the ILIKE path with no deploy/rebuild.

**Bug fixed in this phase**: `GET /search/suggestions` and `POST
/search/advanced` were calling `SearchService.suggestions()` /
`.advancedSearch()` — methods that didn't exist on the class. This
compiled without error only because of the `[x: string]: any` index
signature on `SearchService`, so both routes 500'd at runtime.
`suggestions()` is now implemented for real (Meilisearch-backed, see
`SearchService.suggestions()`'s header comment). `advancedSearch()` is
**not** fixed — out of scope for this phase — `POST /search/advanced`
still 500s.

Search queries are now also tracked in the new `search_events` table
(`SearchService.trackSearchEvent()`, fire-and-forget) — not read by
anything yet; this is the raw data Phase 4's trending-searches feature
will aggregate. Run `npx prisma db push` (from `apps/api`) to apply the
new table before deploying this phase, per the project's existing schema
workflow.

## Phase 3 — facets + geo search

**Important architectural finding**: the real marketplace pages
(`/cars`, `/motorcycles`, etc.) do **not** call `/search/listings` at
all — they call `/listings` (`ListingsService.findAll()`, plain Postgres
filters), a completely separate code path from everything Phase 1/2
built. Wiring facets/geo into `/search/listings` only, per this phase's
original plan, would have been correct-but-invisible to actual users.
Instead, this phase:

- Added facets + exact geo (`_geoRadius`) to `/search/listings` /
  `MeilisearchSearchStrategy.search()` anyway (it's the header search
  bar's data source, and low-risk since Phase 2 already isolated it with
  a fallback).
- Added a **new, additive** endpoint, `GET /listings/facets`
  (`ListingsService.getFacets()`), that the marketplace filter sidebar
  calls in parallel with its existing `/listings` request — same filter
  query params, Meilisearch-backed facet counts only. `findAll()`/
  `/listings` itself is completely unchanged; nothing about which
  listings it returns, or how, was touched.
- Added an additive `lat`/`lng`/`radiusKm` bounding-box filter directly to
  `/listings` (`ListingsService.buildWhereClause()`) for "near me" —
  approximate (a box, not a true circle; see that method's comment),
  chosen specifically because it needed no new indexes and didn't touch
  any existing filter logic. `/search/listings`'s geo filtering, by
  contrast, uses Meilisearch's exact `_geoRadius`.

**Frontend**: wired into `MotorcyclesClient.tsx` (facet counts on
brand/condition, a "near me" toggle, and URL query-string sync for
shareable filtered links). **Not** wired into `CarsMarketplaceClient.tsx`
— that component's own header comment already documents that its filters
use static brand *names* and display-cased enum values that don't match
what the backend/Meilisearch actually store (`make=Toyota` isn't a
recognized field; `fuelType=Petrol` doesn't match the `PETROL` enum
value) — pre-existing bugs, out of scope for this phase, that would need
fixing before facet counts could be wired there correctly. Accessory/
service marketplace pages (`ListingTypeClient.tsx`) were left alone
entirely — their filters (serviceType, mobile, etc.) aren't part of the
Meilisearch document schema at all (see Phase 1's `ListingDocument`
comment on why it's deliberately lean), so there's nothing to facet.

## Local dev setup

1. `docker compose up meilisearch` (or just run the full stack — `api` and
   `worker` both `depends_on: meilisearch { condition: service_healthy }`).
2. Set `MEILISEARCH_API_KEY` in your root `.env` (used as Meilisearch's
   `MEILI_MASTER_KEY`) — see `.env.example`.
3. `apps/api/.env` and `apps/worker/.env` both need `MEILISEARCH_URL` +
   `MEILISEARCH_API_KEY` — see each app's `.env.example`. In Docker,
   `MEILISEARCH_URL` is `http://meilisearch:7700`; running either app
   directly on the host, use `http://localhost:7700`.
4. Start the API once so `MeilisearchService.ensureListingsIndex()` creates
   the index and applies settings.
5. Trigger `POST /admin/search/reindex` to backfill existing data.
