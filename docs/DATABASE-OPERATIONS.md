# Database Operations — CarsAuto

PROMPT 2. Production Postgres runs on a managed provider with built-in
Multi-AZ automated failover — **AWS RDS for Postgres 16**, assumed unless
you've told the team otherwise (see `apps/k8s/secrets.yaml`'s header for
why: no dedicated DBA/SRE staffing to run a self-hosted Patroni/repmgr
cluster safely). `docker-compose.yml`'s self-hosted primary + 2 streaming
replicas remain exactly as they are — genuinely useful for local dev,
genuinely not what production points at. This doc covers the managed side.

## Provisioning the RDS instance

1. **Engine**: PostgreSQL 16, matching `docker-compose.yml`'s
   `postgres:16-alpine` and `apps/api/prisma/schema.prisma`'s target.
2. **Multi-AZ: enabled.** This is the entire point — RDS provisions a
   synchronously-replicated standby in a different Availability Zone and
   automatically promotes it (typically well under a minute) if the
   primary becomes unreachable, updating the writer endpoint's DNS to
   point at the new primary. No manual intervention, no app-code
   participation.
3. **Automated backups: enabled at the RDS level**, independent of and in
   addition to this repo's existing `pg_dump`-based `backup` service in
   `docker-compose.yml` (daily, retained per `BACKUP_RETENTION_DAYS`,
   local-dev-only). RDS automated backups give you point-in-time recovery
   (restore to any second within the retention window, not just the
   nightly snapshot) and are the recovery mechanism if the *storage
   volume itself* is corrupted — a `pg_dump` file can't help with that,
   it can only restore logical data. Set the backup retention window
   (RDS default is 7 days; consider matching or exceeding this repo's
   `BACKUP_RETENTION_DAYS` default of 30) and enable
   `copy-tags-to-snapshot` so backups inherit cost-tracking tags.
4. **Instance class**: not specified here — this is a real capacity/cost
   decision (like the object-storage choice in `apps/k8s/
   promtail-daemonset.yaml`) that depends on measured production load this
   pass doesn't have. Start with whatever RDS instance class matches your
   current self-hosted Postgres container's `deploy.resources.limits` in
   `docker-compose.yml` as a floor, and size up based on actual CloudWatch
   CPU/connections/IOPS metrics after the first few weeks live.
5. **Read replicas**: provision 1–2 RDS read replicas of the Multi-AZ
   primary (RDS supports up to 15). Each gets its own endpoint; append them
   comma-separated to `apps/k8s/secrets.yaml`'s `DATABASE_READ_URLS` (see
   that file's comment — no code change needed, `prisma.service.ts`'s
   `resolveReplicaUrls()` just splits on comma). Read replicas have an
   **independent** failover/recovery lifecycle from the Multi-AZ primary —
   a read replica going down does not trigger a primary failover, and
   vice versa (see "Read replica unavailability" below).
6. **Security group**: allow inbound `5432` only from the Kubernetes
   cluster's node/pod CIDR range (or a VPC peering connection, if the
   cluster isn't in the same VPC) — never expose the instance publicly.
7. **Parameter group**: at minimum, confirm `rds.force_ssl = 1` (encrypt
   connections in transit) and that `max_connections` comfortably exceeds
   PgBouncer's real upstream connection count — see "Connection math"
   below.

## What the app experiences during a failover

RDS Multi-AZ failover is designed so application code needs to do
approximately nothing:

1. The primary becomes unreachable (hardware failure, AZ outage, or a
   planned failover during instance maintenance).
2. RDS promotes the standby and repoints the **writer endpoint's DNS**
   (the same hostname you configured in `DATABASE_DIRECT_URL` — it does
   NOT change) at the new primary. AWS documents this as typically
   completing in under a minute.
3. During that window, in-flight and new connections to the writer
   endpoint fail with a connection error — this is the "brief connection
   errors" the objective mentions, not a bug to route around.
4. `apps/k8s/pgbouncer-deployment.yaml`'s PgBouncer instances reconnect
   automatically once the endpoint resolves again — no restart needed on
   PgBouncer's side.
5. `apps/api/src/common/prisma/prisma.service.ts`'s health-tracking
   reacts within seconds: a failed query fires Prisma's `$on('error')`
   listener immediately (marking that connection's target unhealthy), and
   a periodic recheck (every 10s, shortened from 30s specifically for this
   — see that file's comment) recovers it the moment it responds again.
   `readWithFallback()` additionally gives any *specific* in-flight read
   query one bounded retry against a different replica/the primary before
   surfacing an error to the caller.
6. **What a user actually sees**: at most a handful of requests erroring
   (likely with a 500, caught by `AllExceptionsFilter` and reported to
   Sentry — see `docs/ERROR-TRACKING.md`) during the failover window,
   then normal operation resumes automatically. No manual DNS/secret
   update, no pod restart, no on-call page required *unless* the failover
   itself was caused by something that needs follow-up investigation
   (check RDS Events in the console/CloudWatch afterward either way).

### Read replica unavailability

A read replica becoming unreachable (separate from a primary failover) is
handled entirely in application code, not by RDS: `prisma.service.ts`'s
`db('read')` round-robins across replicas already known-healthy and falls
back to the primary once ALL configured replicas are unhealthy — reads
keep working, just against the primary (higher load on it, but correct
data) until the replica recovers. See that file's top comment for the full
health-tracking design and its deliberately-scoped limits.

## Pointing staging vs. production at different instances

Provision **separate RDS instances** for staging and production — never
share one, even with different database names/schemas (a staging migration
or load test shouldn't be able to affect production data, and RDS billing/
scaling decisions differ per environment anyway). Each environment gets its
own `apps/k8s/secrets.yaml` (or, per that file's own header, a Sealed
Secrets / External Secrets Operator / SOPS-managed equivalent — this raw
file is a template, never applied as-is) with that environment's own
`DATABASE_URL` / `DATABASE_DIRECT_URL` / `DATABASE_READ_URLS` values
pointing at its own RDS endpoints. Nothing else changes between
environments — same manifests, same `apps/k8s/kustomization.yaml`, same
CI pipeline; only the secret content differs per cluster/namespace you
deploy into.

## Connection math (RDS-specific addendum)

See `prisma.service.ts`'s own "Connection math" comment for the full
pod-count/PgBouncer-replica/`PRISMA_CONNECTION_LIMIT` arithmetic — it
already models PgBouncer's upstream connection count (2 replicas x
`DEFAULT_POOL_SIZE` 20 = 40 real connections into Postgres, independent of
API pod count). The one RDS-specific addition: confirm your chosen RDS
instance class's `max_connections` default (varies by instance size —
check the parameter group, it's derived from allocated memory) comfortably
exceeds that 40, with headroom for direct `psql`/migration connections
(which bypass PgBouncer, per `DATABASE_DIRECT_URL`'s own comment) and each
read replica's own separate connection budget (sized against
`pods x PRISMA_CONNECTION_LIMIT` directly, since replicas aren't behind
their own PgBouncer in this manifest set — see that same comment's note on
why, and what adding one would take).

## Migrations against RDS

No change from how `.github/workflows/ci.yml`'s `deploy` job already runs
them (see that job's "Run database migrations" step) — it targets
`DATABASE_DIRECT_URL`, which now resolves to the RDS writer endpoint
instead of an in-cluster Postgres Service. Nothing else about that step
needed to change for this prompt.
