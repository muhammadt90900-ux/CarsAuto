// apps/api/loadtest/admin-dealers-load-test.js
//
// PROMPT 8 FIX: k6 script for load-testing /admin/* and /dealers/* after the
// N+1 fixes + read-replica routing in admin.service.ts / dealers.service.ts.
// See ./README.md for how to run this and what to check afterward.
//
// Routes below were checked against the actual controllers as of this
// writing (admin.controller.ts, dealers.controller.ts) — NOT guessed. Two
// admin.service.ts methods this prompt touched, getAllDealers() and
// getTransactions() (plus getUserDetail/getTransactionDetail/
// getDealerSubscriptions/getUserSubscriptions), aren't wired to any
// controller route yet — see README.md's "Endpoints that exist in the
// service but aren't reachable yet" section. This script only exercises
// routes that actually exist today.

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend } from 'k6/metrics';

const statsTrend        = new Trend('admin_stats_duration');
const analyticsTrend     = new Trend('admin_analytics_duration');
const usersListTrend     = new Trend('admin_users_list_duration');
const listingsListTrend  = new Trend('admin_listings_list_duration');
const pendingListTrend   = new Trend('admin_listings_pending_duration');
const reportsListTrend   = new Trend('admin_reports_duration');
const auditLogsTrend     = new Trend('admin_audit_logs_duration');
const dealersListTrend   = new Trend('dealers_list_duration');
const dealerDetailTrend  = new Trend('dealer_detail_duration');
const dealerAnalyticsTrend = new Trend('dealer_me_analytics_duration');
const dealerFollowersTrend = new Trend('dealer_followers_duration');

// ── Config — override via environment variables, don't hardcode staging URLs ──
const BASE_URL      = __ENV.BASE_URL      || 'https://staging.carsauto.example/api';
const ADMIN_TOKEN    = __ENV.ADMIN_TOKEN;    // required — JWT for a user with role=ADMIN
const DEALER_TOKEN   = __ENV.DEALER_TOKEN;   // required — JWT for a user with a dealer profile (for /dealers/me/*)
const DEALER_SLUG    = __ENV.DEALER_SLUG     || 'sample-dealer'; // an existing staging dealer's slug
const DEALER_ID      = __ENV.DEALER_ID;      // required — that same dealer's id (for /dealers/:id/followers)

if (!ADMIN_TOKEN) throw new Error('Set ADMIN_TOKEN env var — see README.md.');
if (!DEALER_TOKEN) throw new Error('Set DEALER_TOKEN env var — see README.md.');
if (!DEALER_ID) throw new Error('Set DEALER_ID env var to an existing staging dealer id.');

export const options = {
  scenarios: {
    admin_and_dealer_read_paths: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 10 },  // ramp up
        { duration: '2m',  target: 25 },  // sustained — a handful of admins/dealers, not public traffic volume
        { duration: '30s', target: 0 },   // ramp down
      ],
    },
  },
  thresholds: {
    // Proxy check only — total response time includes network +
    // serialization on top of the query itself. The REAL check is grepping
    // staging logs for "Slow query" during this run's time window (see
    // README.md step 3) — that's what SLOW_QUERY_THRESHOLD_MS (500ms) in
    // prisma.service.ts actually measures.
    admin_stats_duration:            ['p(95)<800'],
    admin_analytics_duration:        ['p(95)<800'],
    admin_users_list_duration:       ['p(95)<800'],
    admin_listings_list_duration:    ['p(95)<800'],
    admin_listings_pending_duration: ['p(95)<800'],
    admin_reports_duration:          ['p(95)<800'],
    admin_audit_logs_duration:       ['p(95)<800'],
    dealers_list_duration:           ['p(95)<800'],
    dealer_detail_duration:          ['p(95)<800'],
    dealer_me_analytics_duration:    ['p(95)<800'],
    dealer_followers_duration:       ['p(95)<800'],
    http_req_failed:                 ['rate<0.01'], // <1% error rate
  },
};

const adminHeaders  = { headers: { Authorization: `Bearer ${ADMIN_TOKEN}` } };
const dealerHeaders = { headers: { Authorization: `Bearer ${DEALER_TOKEN}` } };

export default function () {
  // ── Admin dashboard + analytics (getDashboardStats / getAnalyticsCharts) ──
  let res = http.get(`${BASE_URL}/admin/stats`, adminHeaders);
  check(res, { 'admin/stats 200': (r) => r.status === 200 });
  statsTrend.add(res.timings.duration);

  res = http.get(`${BASE_URL}/admin/analytics`, adminHeaders);
  check(res, { 'admin/analytics 200': (r) => r.status === 200 });
  analyticsTrend.add(res.timings.duration);

  // ── Admin list views — hit page 1 and a deep-ish page to catch skip/take issues ──
  res = http.get(`${BASE_URL}/admin/users?page=1&limit=20`, adminHeaders);
  check(res, { 'admin/users 200': (r) => r.status === 200 });
  usersListTrend.add(res.timings.duration);

  res = http.get(`${BASE_URL}/admin/listings?page=10&limit=20`, adminHeaders);
  check(res, { 'admin/listings 200': (r) => r.status === 200 });
  listingsListTrend.add(res.timings.duration);

  res = http.get(`${BASE_URL}/admin/listings/pending?page=1&limit=20`, adminHeaders);
  check(res, { 'admin/listings/pending 200': (r) => r.status === 200 });
  pendingListTrend.add(res.timings.duration);

  res = http.get(`${BASE_URL}/admin/reports?page=1&limit=20`, adminHeaders);
  check(res, { 'admin/reports 200': (r) => r.status === 200 });
  reportsListTrend.add(res.timings.duration);

  res = http.get(`${BASE_URL}/admin/audit-logs?page=1&limit=50`, adminHeaders);
  check(res, { 'admin/audit-logs 200': (r) => r.status === 200 });
  auditLogsTrend.add(res.timings.duration);

  // ── Dealer-facing endpoints (public list/detail + authenticated "me") ────
  res = http.get(`${BASE_URL}/dealers?page=1&limit=20`, {});
  check(res, { 'dealers list 200': (r) => r.status === 200 });
  dealersListTrend.add(res.timings.duration);

  res = http.get(`${BASE_URL}/dealers/${DEALER_SLUG}`, {});
  check(res, { 'dealer detail 200': (r) => r.status === 200 });
  dealerDetailTrend.add(res.timings.duration);

  res = http.get(`${BASE_URL}/dealers/me/analytics?days=30`, dealerHeaders);
  check(res, { 'dealer me/analytics 200': (r) => r.status === 200 });
  dealerAnalyticsTrend.add(res.timings.duration);

  res = http.get(`${BASE_URL}/dealers/${DEALER_ID}/followers?page=1&limit=20`, {});
  check(res, { 'dealer followers 200': (r) => r.status === 200 });
  dealerFollowersTrend.add(res.timings.duration);

  sleep(1); // ~1 req/endpoint/VU/sec — admin/dealer dashboards, not a hammering pattern
}
