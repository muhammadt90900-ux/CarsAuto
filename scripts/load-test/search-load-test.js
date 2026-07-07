// scripts/load-test/search-load-test.js
//
// Search Architecture Phase 5: lightweight load test for the search
// endpoints, using autocannon rather than k6 — the repo's e2e/ directory
// only has Playwright (functional browser tests, not load testing), and
// there was no load-testing tool already in the repo to extend, so this
// adds the smaller of the two options the phase plan offered. Run with:
//
//   npm run test:load:search
//   API_URL=https://staging.carsauto.iq/api npm run test:load:search
//
// What this measures: p50/p95/p99 latency and error rate for
// GET /search/listings and GET /search/suggestions under a realistic
// concurrent rate — NOT a stress-to-failure test. Use the results to
// sanity-check the Phase 2 cache TTLs (CACHE_TTL_SEARCH,
// CACHE_TTL_SUGGEST in search.service.ts), the MEILISEARCH_TIMEOUT_MS
// fallback threshold, and BullMQ search-index queue concurrency — if
// this test shows meaningfully more fallback-to-Postgres events than a
// quiet baseline (compare against carsauto_meilisearch_fallback_total in
// Grafana during the run), one of those three is probably undersized.

const autocannon = require('autocannon');

const API_URL = process.env.API_URL ?? 'http://localhost:4000/api';
const DURATION_SECONDS = Number(process.env.LOAD_TEST_DURATION ?? 30);
// 20 concurrent connections is a "realistic peak traffic" guess for this
// catalog's scale, not a measured number — adjust once real traffic data
// exists (see carsauto_http_requests_total in Grafana for actual current load).
const CONNECTIONS = Number(process.env.LOAD_TEST_CONNECTIONS ?? 20);

const SAMPLE_QUERIES = ['toyota', 'corolla', 'kia', 'honda civic', 'ford', 'i30', 'elantra', 'sonata'];

function pickQuery() {
  return SAMPLE_QUERIES[Math.floor(Math.random() * SAMPLE_QUERIES.length)];
}

async function run(title, opts) {
  console.log(`\n── ${title} ──`);
  const result = await autocannon({
    url: API_URL,
    connections: CONNECTIONS,
    duration: DURATION_SECONDS,
    ...opts,
  });
  console.log(autocannon.printResult(result, { outputStream: process.stdout }));
  return result;
}

async function main() {
  console.log(`Load-testing ${API_URL} — ${CONNECTIONS} connections × ${DURATION_SECONDS}s per endpoint`);

  const searchResult = await run('GET /search/listings', {
    requests: [{ method: 'GET', path: () => `/search/listings?q=${encodeURIComponent(pickQuery())}` }],
  });

  const suggestResult = await run('GET /search/suggestions', {
    requests: [{ method: 'GET', path: () => `/search/suggestions?q=${encodeURIComponent(pickQuery().slice(0, 3))}` }],
  });

  const failed = [searchResult, suggestResult].some((r) => r.errors > 0 || r.non2xx > 0);
  if (failed) {
    console.error('\nOne or more endpoints returned errors/non-2xx responses during the load test.');
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error('Load test failed to run:', err);
  process.exitCode = 1;
});
