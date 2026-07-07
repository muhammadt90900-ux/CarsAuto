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

## Phase 4 — ranking + relevance tuning

Every ACTIVE listing now has a `rankingScore` (Prisma `Listing.rankingScore`,
default 1.0), used as Meilisearch's sort tiebreaker — see
`ensureListingsIndex()`'s `rankingRules`: text-match relevance first, then
`rankingScore:desc`, then `createdAt:desc`.

**Formula** (`common/ranking/ranking-formula.ts` — duplicated in
`apps/api` and `apps/worker`, same convention as `MeilisearchService`):

```
rankingScore = freshnessScore × featuredMultiplier × dealerMultiplier × ctrMultiplier
```

- **freshnessScore** — exponential decay from `createdAt`, 14-day half-life, floored at 0.05.
- **featuredMultiplier** — ×1.8 while `featured && featuredUntil > now`, else ×1.0.
- **dealerMultiplier** — ×1.3 if the listing's dealer has `verifiedAt` set, else ×1.0.
- **ctrMultiplier** — only applied once a listing has ≥20 impressions in the
  trailing 14 days (below that, no adjustment — too little signal to trust).
  Above that: `clicks / impressions` compared to an assumed 5% catalog-average
  CTR, clamped to `[0.7, 1.5]`.

All five numeric constants are first-pass estimates — expect to retune
once there's a few weeks of real `search_events`/`search_clicks` volume.

**Impressions & clicks**: `SearchEvent.resultListingIds` (up to the top 20
listing ids per search, written by `SearchService.search()`) is the
impressions half; the new `SearchClick` table (written by
`POST /search/click`, called by the frontend when a user clicks a result
card) is the clicks half.

**Recompute triggers**:
- Nightly, for every ACTIVE listing in batches of 500 —
  `apps/worker/src/processors/ranking-recompute.processor.ts` (same
  BullMQ repeatable-job structure as `partition-maintenance.processor.ts`,
  registered on the same `maintenance` queue, 04:00 UTC daily). Computes
  the CTR aggregate for the *entire* catalog in 2 raw SQL queries (not
  2×N), persists via one bulk `UPDATE ... FROM (VALUES ...)` per batch,
  then re-enqueues each listing onto the `search-index` queue so
  Meilisearch's copy of the score updates too.
- Immediately, for a single listing — `search-index.processor.ts`'s
  existing on-create/on-update indexing path now also recomputes and
  persists that one listing's score before building its Meilisearch
  document, so a brand-new listing isn't stuck at the schema default
  until the next nightly run.

**Debugging a "why is this listing ranked here" complaint**:
`GET /admin/listings/:id/ranking` returns the full breakdown (each
multiplier, the raw inputs, and both the currently-stored score and a
freshly-recomputed one) — read-only, never persists anything.

**Not yet wired**: the frontend doesn't call `POST /search/click` anywhere
yet — this phase implemented the backend endpoint and the CTR pipeline
it feeds, but wiring the call into the search-results card's click
handler (and passing along the `searchEventId` `SearchService.search()`
now returns) is frontend work left for whoever builds the actual search
results page UI. Until that's wired up, every listing's CTR stays 0 and
`ctrMultiplier` stays 1.0 for everyone — harmless (the formula degrades
to freshness × featured × dealer-trust only), just inert.

Run `npx prisma db push` (from `apps/api`) to apply `rankingScore`,
`SearchEvent.resultListingIds`, and the new `search_clicks` table before
deploying this phase.

## Phase 5 — observability, resilience, load hardening

**Metrics** (`common/monitoring/metrics.service.ts`, scraped at `/api/metrics`):
- `carsauto_meilisearch_query_duration_seconds{outcome}` — histogram, `outcome` is `hit`/`timeout`/`error`.
- `carsauto_meilisearch_fallback_total{reason}` — counter, `reason` is `timeout`/`error`.
- `carsauto_meilisearch_health_up` — gauge, polled every 15s by `SearchIndexMetricsService`.
- `carsauto_search_index_queue_depth{state}` — gauge (`waiting`/`active`/`delayed`/`failed`), same 15s poll.
- `carsauto_search_reindex_enqueue_duration_seconds` — histogram; times `POST /admin/search/reindex`'s enqueue loop only, **not** full indexing completion (that happens async in the worker — there's no single "reindex done" event to time end-to-end without more infra than this phase adds; the queue-depth gauge above is the practical proxy for "how far behind is indexing right now").

5 corresponding panels are in `monitoring/grafana/dashboards/carsauto-overview.json` (ids 9–13). The older `autobazaar-overview.json` dashboard was left untouched — it looks like a pre-rebrand duplicate, not something actively maintained alongside the current one.

**Nightly consistency check** (`apps/worker/src/processors/search-consistency-check.processor.ts`, 04:30 UTC daily): compares Postgres's ACTIVE listing count against Meilisearch's document count (>2% drift = alert), and field-compares (title/price/status) 25 random ACTIVE listings (>2 mismatches = alert). Alerts via `logger.error` always, plus an email to `ADMIN_ALERT_EMAIL` if that env var is set — there's no Slack/PagerDuty integration in this repo yet, so email via the worker's existing `EmailService` is the closest available hook.

**Load testing**: `npm run test:load:search` (autocannon — see `scripts/load-test/search-load-test.js`'s header comment for why autocannon over k6: the repo's `e2e/` only had Playwright, no existing load-test tooling to extend). Exercises `GET /search/listings` and `GET /search/suggestions` at a configurable concurrency (default 20) for a configurable duration (default 30s). Use its output alongside the Grafana panels above to tune `CACHE_TTL_SEARCH`/`CACHE_TTL_SUGGEST` (search.service.ts), `MEILISEARCH_TIMEOUT_MS`, and the `search-index` BullMQ queue's concurrency.

### Rollback runbook

**Search relevance or availability regressed — go back to Postgres ILIKE search:**
1. Set `SEARCH_ENGINE_MODE=postgres` (docker-compose `api` service env, or the k8s configmap).
2. Restart the `api` deployment/service (no rebuild, no migration).
3. Confirm via the Meilisearch-health/fallback-rate Grafana panels that fallback is now 100% (expected — everything is now intentionally bypassing Meilisearch, not "falling back" to it).
4. To re-enable later: flip the env var back to `meilisearch` (or remove it — that's the default) and restart again.

**Force a full reindex** (after a rollback, after suspected drift, or after a bulk data migration):
1. `POST /admin/search/reindex` (admin auth required).
2. Watch `carsauto_search_index_queue_depth{state="waiting"}` in Grafana drop back toward 0 — that's when indexing has actually caught up (the endpoint itself returns immediately after enqueueing, per its own docstring).

**Check queue backlog directly** (without waiting for the next Grafana scrape):
```
# From a shell with access to the same Redis the BullMQ queues use:
redis-cli -a $REDIS_PASSWORD LLEN bull:search-index:wait
redis-cli -a $REDIS_PASSWORD LLEN bull:search-index:active
redis-cli -a $REDIS_PASSWORD LLEN bull:search-index:failed
```
A consistently large or growing `wait` count means the worker isn't keeping up — check worker replica count/CPU before assuming it's a Meilisearch-side problem.

**A specific listing seems to be ranked wrong:** `GET /admin/listings/:id/ranking` (Phase 4) before assuming it's a search-relevance bug — it may just be a low/expected `rankingScore` (e.g. an old, unfeatured, unverified-dealer listing with no click history).

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
