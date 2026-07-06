# Load-testing /admin/* and /dealers/* (Prompt 8)

How to confirm the N+1 fixes + read-replica routing in `admin.service.ts` /
`dealers.service.ts` actually hold up under load in staging, and that
**no query in this path logs as slow** (`SLOW_QUERY_THRESHOLD_MS`, default
500ms, already wired up in `prisma.service.ts`).

## 0. Endpoints that exist in the service but aren't reachable yet

While auditing these two files, 6 `AdminService` methods turned out to have
no controller route wired to them at all: `getUserDetail`, `getAllDealers`,
`getTransactions`, `getTransactionDetail`, `getDealerSubscriptions`,
`getUserSubscriptions`. They were still fixed (N+1 / replica-routing) since
the prompt was to audit the whole file, but the load test below can only
exercise routes that actually exist today — it does not cover these 6.
Wire them into `admin.controller.ts` (or confirm they're intentionally
unused / planned for a future admin UI) before they matter for a load test.

## 1. Get realistic data volume in staging first

These are aggregation endpoints — `count()`/`aggregate()`/paginated
`findMany()` over full tables. Their performance characteristics on an
empty or near-empty staging DB tell you almost nothing; a `LIMIT 20`
query over 50 rows and over 500,000 rows can look identical until an index
is missing, at which point they diverge sharply. Before running the script
below:

- Seed staging with production-scale row counts (ideally an anonymized
  snapshot of production, or a synthetic seed script matching production's
  approximate table sizes — users, listings, dealers, payments, reports,
  audit logs are the tables these two files query).
- If you don't have that yet, at minimum seed enough rows that
  `admin/listings?page=10` and `admin/users?page=1` aren't hitting a table
  with fewer than a few thousand rows — page 10 at limit 20 needs 200+ rows
  to even be a meaningful `skip`/`take` test.

## 2. Get a staging admin JWT + dealer JWT

```bash
# Admin token (adjust to however staging login actually works — this
# assumes email/password login against a seeded staging admin account)
curl -s -X POST https://staging.carsauto.example/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@staging.carsauto.example","password":"<staging admin password>"}' \
  | jq -r .accessToken
# -> export ADMIN_TOKEN=<that value>

# Dealer token — log in as a staging user that has a Dealer profile
curl -s -X POST https://staging.carsauto.example/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"dealer@staging.carsauto.example","password":"<staging dealer password>"}' \
  | jq -r .accessToken
# -> export DEALER_TOKEN=<that value>
```

Also grab that dealer's `slug` and `id` (e.g. via `GET /dealers?search=...`
or directly from the staging DB) for `DEALER_SLUG` / `DEALER_ID` below.

## 3. Run the k6 script

[k6](https://k6.io) — chosen over autocannon because these are
authenticated, multi-endpoint scenarios with per-endpoint thresholds;
autocannon is better suited to hammering one URL at a time.

```bash
# Install (one-time)
brew install k6          # macOS
# or: sudo apt install k6   /   docker run -i grafana/k6 run - < script.js

# Run against staging
BASE_URL=https://staging.carsauto.example/api \
ADMIN_TOKEN=<from step 2> \
DEALER_TOKEN=<from step 2> \
DEALER_SLUG=<a real staging dealer slug> \
DEALER_ID=<that dealer's id> \
k6 run apps/api/loadtest/admin-dealers-load-test.js
```

This ramps 0→10→25 virtual users over ~3 minutes, hitting every reachable
read endpoint in both files once per VU iteration (see the script for the
exact list). k6 prints a pass/fail summary against the `thresholds` in the
script (p95 < 800ms per endpoint, <1% error rate) — but treat that as a
smoke check, not the real verdict. The real verdict is step 4.

## 4. The check that actually matters: grep staging logs for slow queries

`prisma.service.ts`'s Prisma `$on('query', ...)` listener (production log
config) already logs `Slow query (${duration}ms): ...` for anything at or
above `SLOW_QUERY_THRESHOLD_MS` (500ms default). During and immediately
after the k6 run:

```bash
# Adjust to however staging logs are shipped (stdout/kubectl logs, a log
# aggregator, etc.) — this assumes kubectl for a k8s staging deployment:
kubectl logs -n carsauto -l app=carsauto-api --since=10m | grep "Slow query"

# Or against a local docker-compose staging stack:
docker compose logs api --since=10m | grep "Slow query"
```

**Confirm this returns ZERO matches for the time window the k6 run covered.**
Any match means a query in this path is still slow under load even after
the N+1 fixes — note the exact query text logged (it's truncated to 200
chars in the log line) and go find which of the two files' methods it came
from before considering this prompt's fixes verified.

If you see slow-query hits specifically on `admin/listings` or
`admin/users` at deep pagination (`page=10`+), check that `createdAt` (or
whatever the `orderBy` column is) has an index — `skip`/`take` pagination
without an index on the sort column degenerates badly at depth regardless
of how lean the `select`/`include` is.

## 5. Re-run after seeding MORE data, not just once

A single run at one data volume can miss a problem that only shows up past
a certain table size (e.g. a sequential scan that's fine at 10k rows and
slow at 500k). If staging's seed size is far below production's actual
scale, treat a clean result here as provisional, not final — the
`pg_trgm` index work (a separate fix) has the same caveat for the same
reason.
