// apps/api/src/common/prisma/prisma.service.ts
//
// F-ARCH fix: read-replica support.
//
// IMPORTANT DEVIATION FROM THE ORIGINAL PLAN — read before touching this file:
// The original plan called for `this.write`/`this.read` as two equal-status
// PrismaClient properties, with every caller switching to
// `prisma.db('read'|'write').listing.findMany(...)`. That's not viable as
// written: PrismaService EXTENDS PrismaClient, and every one of this
// codebase's ~30 services calls `this.prisma.<model>.<op>(...)` directly —
// `this.prisma` IS a PrismaClient via inheritance, not a wrapper around one.
// Renaming that to a non-extending wrapper would break every single
// existing call site, not just the 3 read-heavy services this fix targets.
//
// So instead: PrismaService keeps extending PrismaClient exactly as before
// (zero changes for the ~30 unrelated call sites) — `this`/`this.prisma` IS
// the "write" client, implicitly, same as it always was. Only a NEW
// `readonly read: PrismaClient` property and a `db()` helper are added.
// The 3 read-heavy services this fix targets call `this.prisma.db('read')`
// explicitly; everyone else is untouched.
//
// F-PERF fix (Prompt 7): `db('read')` now load-balances across MULTIPLE
// configured replicas (round-robin, skipping any currently-unhealthy one)
// instead of always returning the single DATABASE_READ_URL client. Fully
// backward compatible: 0 or 1 replica configured behaves EXACTLY as before
// (0 → read hits the primary DB via DATABASE_URL, same as today's
// no-replica fallback; 1 → every read hits that one replica, same as
// today). See resolveReplicaUrls() below for the env var convention.

import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

// Pool sizing and slow-query threshold are configurable via env vars.
const SLOW_QUERY_THRESHOLD_MS = parseInt(
  process.env.SLOW_QUERY_THRESHOLD_MS ?? '500',
  10,
);
const isProd = process.env.NODE_ENV === 'production';

// ── Multi-replica configuration (Prompt 7) ───────────────────────────────────
//
// Env var convention: comma-separated DATABASE_READ_URLS — chosen over
// numbered DATABASE_READ_URL_1/_2/... because it's a single field to manage
// in most PaaS dashboards (Render, Railway, etc. all support long env
// values fine) and adding/removing a replica is a one-line edit rather than
// renumbering. GJ: if you later move to a platform where numbered vars fit
// better (e.g. you're templating them from separate secret objects), this
// is the one function to change — nothing else in this file assumes the
// comma-separated shape.
//
// Precedence (all backward compatible with pre-Prompt-7 deployments):
//   1. DATABASE_READ_URLS set  → split on comma, trim, drop empties, de-dupe.
//   2. else DATABASE_READ_URL set → single-element array (today's behavior).
//   3. else → empty array; caller falls back to DATABASE_URL (today's
//      "no replica configured" behavior — reads hit the primary).
export function resolveReplicaUrls(): string[] {
  const multi = process.env.DATABASE_READ_URLS?.trim();
  if (multi) {
    const urls = multi.split(',').map((u) => u.trim()).filter(Boolean);
    return [...new Set(urls)];
  }
  const single = process.env.DATABASE_READ_URL?.trim();
  return single ? [single] : [];
}

// Strips credentials before a URL ever reaches a log line.
function redactUrl(url: string): string {
  try {
    const parsed = new URL(url);
    if (parsed.password) parsed.password = '***';
    return parsed.toString();
  } catch {
    return '(unparseable-url)';
  }
}

interface ReadReplica {
  client: PrismaClient;
  /** Redacted (no credentials) — safe to log. */
  label: string;
  healthy: boolean;
}

// F-PERF fix: explicit, capped pool size per PrismaClient.
//
// Previously DATABASE_URL was passed straight to PrismaClient with no
// connection_limit set, so Prisma defaulted to (num_cpus * 2 + 1)
// connections PER CLIENT -- and this class creates TWO clients per pod
// (this for writes, this.read for reads). With PgBouncer now sitting in
// front of Postgres (see docker-compose.yml and
// apps/k8s/pgbouncer-deployment.yaml), each pod's own pool must ALSO be
// capped small -- otherwise pods just open a large uncapped pool against
// PgBouncer's own client limit, defeating the point of putting a pooler in
// front of Postgres at all.
//
// PRISMA_CONNECTION_LIMIT / PRISMA_POOL_TIMEOUT are configurable via env
// vars so this can be tuned per environment without a code change.
const PRISMA_CONNECTION_LIMIT = process.env.PRISMA_CONNECTION_LIMIT ?? '5';
const PRISMA_POOL_TIMEOUT = process.env.PRISMA_POOL_TIMEOUT ?? '10';

// Connection math (keep this comment in sync with reality):
//   Per pod:       (1 write + R read-replica) PrismaClients x
//                  PRISMA_CONNECTION_LIMIT, where R = however many replicas
//                  are configured (resolveReplicaUrls() below) — 1 by
//                  default (today's single-DATABASE_READ_URL behavior).
//   Per cluster:   pods x (1 + R) x PRISMA_CONNECTION_LIMIT
//                  -> must stay comfortably under PgBouncer's
//                     MAX_CLIENT_CONN (its client-facing limit) — but ONLY
//                     for the write connection's traffic. Each read
//                     replica is a SEPARATE physical Postgres instance (a
//                     streaming replica), not another database behind the
//                     same PgBouncer — this connection math and
//                     pgbouncer-deployment.yaml's MAX_CLIENT_CONN cover the
//                     primary/write path only. If a replica needs the same
//                     transaction-pooling protection as the primary got in
//                     Prompt 1, it needs its OWN PgBouncer in front of it —
//                     not implemented here; flagged as a follow-up once
//                     apps/k8s/ actually provisions replica infrastructure
//                     (see the replica-count note in
//                     apps/k8s/README.md / docker-compose.yml).
//   Into Postgres: PgBouncer replicas x DEFAULT_POOL_SIZE (primary only)
//                  -> must stay comfortably under Postgres's
//                     max_connections. This does NOT grow with pod count
//                     in transaction-pooling mode -- that's the entire
//                     benefit of PgBouncer being here.
//   Example at current defaults (10 API pods, PRISMA_CONNECTION_LIMIT=5,
//   PgBouncer MAX_CLIENT_CONN=200, DEFAULT_POOL_SIZE=20, 2 PgBouncer
//   replicas): app -> PgBouncer = 10 x 2 x 5 = 100 (< 200, OK). PgBouncer ->
//   Postgres = 2 x 20 = 40 (comfortably under Postgres's default
//   max_connections of 100, leaving headroom for direct psql/migration
//   connections that bypass PgBouncer).
//   At carsauto-api-hpa's ceiling (apps/k8s/hpa.yaml, maxReplicas: 160):
//   app -> PgBouncer = (160 + 2 worker) x 2 x 5 = 1,620 — this is why
//   pgbouncer-deployment.yaml's MAX_CLIENT_CONN was raised to 2,000/replica.
//   PgBouncer -> Postgres is UNCHANGED at 40 regardless of pod count — see
//   the note in pgbouncer-deployment.yaml if that starts showing up as
//   queueing wait under sustained full-scale traffic. Each read replica's
//   OWN connection ceiling (Postgres's max_connections on that replica
//   instance, or its own PgBouncer's DEFAULT_POOL_SIZE if one is added) is
//   a SEPARATE budget from all of the above — size it against
//   pods x PRISMA_CONNECTION_LIMIT directly, not against this primary-path math.

/**
 * Appends Prisma's pool-sizing query params (and pgbouncer=true) to a
 * datasource URL, preserving any query params already present.
 *
 * pgbouncer=true tells Prisma not to use named prepared statements, which
 * PgBouncer's transaction-pooling mode does not support (a prepared
 * statement created on one pooled connection may not exist on the next
 * connection the same client is handed). This is a no-op if the URL happens
 * to point straight at Postgres with no PgBouncer in front of it (e.g. a
 * local dev DATABASE_URL), so it's safe to always set.
 */
function withPoolParams(url: string | undefined): string | undefined {
  if (!url) return url;
  const [base, existingQuery] = url.split('?');
  const params = new URLSearchParams(existingQuery);
  if (!params.has('connection_limit')) {
    params.set('connection_limit', PRISMA_CONNECTION_LIMIT);
  }
  if (!params.has('pool_timeout')) {
    params.set('pool_timeout', PRISMA_POOL_TIMEOUT);
  }
  if (!params.has('pgbouncer')) {
    params.set('pgbouncer', 'true');
  }
  return `${base}?${params.toString()}`;
}

// Use any[] until prisma generate provides Prisma.LogDefinition
const PROD_LOG_CONFIG: any[] = [
  { emit: 'event',  level: 'query' },  // captured below for slow-query detection
  { emit: 'stdout', level: 'error' },
  { emit: 'stdout', level: 'warn' },
];

const DEV_LOG_CONFIG: any[] = [
  { emit: 'stdout', level: 'query' },
  { emit: 'stdout', level: 'info' },
  { emit: 'stdout', level: 'warn' },
  { emit: 'stdout', level: 'error' },
];

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  /**
   * Configured read replicas, in the order resolved by resolveReplicaUrls().
   * Always has at least one entry — if no DATABASE_READ_URL(S) are set, it
   * falls back to a single "replica" pointed at DATABASE_URL (today's
   * behavior: db('read') and db('write') hit the same database).
   */
  private readonly replicas: ReadReplica[];
  private replicaRoundRobinIndex = 0;
  private replicaHealthCheckInterval?: ReturnType<typeof setInterval>;

  /**
   * Backward-compat accessor — the first configured read replica. Prefer
   * `db('read')`, which load-balances across ALL configured replicas; this
   * getter exists only because some earlier code/tooling may still reference
   * `.read` directly instead of `.db('read')`.
   */
  get read(): PrismaClient {
    return this.replicas[0].client;
  }

  constructor() {
    super({
      log: isProd ? PROD_LOG_CONFIG : DEV_LOG_CONFIG,
      datasources: {
        db: { url: withPoolParams(process.env.DATABASE_URL) },
      },
    });

    const configuredUrls = resolveReplicaUrls();
    const replicaUrls = configuredUrls.length > 0 ? configuredUrls : [process.env.DATABASE_URL!];

    this.replicas = replicaUrls.map((url) => ({
      client: new PrismaClient({
        datasources: { db: { url: withPoolParams(url) } },
        // F-PERF fix (Prompt 7): 'error' as an emitted event (not just
        // stdout) so onModuleInit can attach a listener per replica and
        // reactively mark it unhealthy the moment Prisma reports a
        // connection-level error, without waiting for the next periodic
        // health-recheck.
        log: [{ emit: 'event', level: 'error' }],
      }),
      label: redactUrl(url),
      healthy: true,
    }));

    if (isProd) {
      // Log only queries that exceed the slow-query threshold to avoid noise
      (this as any).$on('query', (event: any) => {
        if (event.duration >= SLOW_QUERY_THRESHOLD_MS) {
          this.logger.warn(
            `Slow query (${event.duration}ms): ${event.query.slice(0, 200)}`,
          );
        }
      });
    }
  }

  /**
   * Returns the client to use for a given operation type.
   *   db('read')        → a load-balanced, health-aware read replica (round-
   *                        robin across configured replicas, skipping any
   *                        currently marked unhealthy — falls back to the
   *                        primary if ALL replicas are unavailable).
   *   db('write') / db() → the primary — same as using `this`/`this.prisma`
   *                        directly.
   *
   * Existing code that calls `this.prisma.<model>.<op>(...)` directly
   * (the vast majority of this codebase) is completely unaffected — this
   * is purely additive for callers that explicitly want the replica.
   *
   * F-PERF fix (Prompt 7): "basic health-awareness" as specified — this
   * picks among replicas already known-healthy (from the reactive 'error'
   * listener + periodic recheck below); it does NOT catch a failure of the
   * query the CALLER goes on to run and transparently retry it elsewhere.
   * True per-query retry would need every Prisma call site wrapped in a
   * Proxy, which is a much bigger and riskier change than "basic" calls
   * for — a bad replica degrades to "skipped for the next request", not
   * "invisible to the request already in flight".
   */
  db(operation: 'read' | 'write' = 'write'): PrismaClient {
    if (operation === 'write') return this;

    const healthyReplicas = this.replicas.filter((r) => r.healthy);
    if (healthyReplicas.length === 0) {
      this.logger.warn('All read replicas are marked unhealthy — falling back to the primary for this read.');
      return this;
    }

    const replica = healthyReplicas[this.replicaRoundRobinIndex % healthyReplicas.length];
    this.replicaRoundRobinIndex = (this.replicaRoundRobinIndex + 1) % healthyReplicas.length;
    return replica.client;
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();

    await Promise.all(
      this.replicas.map(async (replica) => {
        try {
          await replica.client.$connect();
        } catch (err) {
          replica.healthy = false;
          this.logger.error(
            `Read replica (${replica.label}) failed to connect at startup, marking unhealthy: ${(err as Error).message}`,
          );
        }

        // Reactive health tracking: mark unhealthy the moment Prisma
        // reports a connection-level error on this specific replica,
        // rather than waiting for the next periodic recheck below.
        (replica.client as any).$on('error', (event: any) => {
          if (replica.healthy) {
            this.logger.error(
              `Read replica (${replica.label}) reported an error, marking unhealthy: ${event?.message ?? event}`,
            );
          }
          replica.healthy = false;
        });
      }),
    );

    this.logger.log(
      `Database connection established (primary + ${this.replicas.length} read replica${this.replicas.length === 1 ? '' : 's'})`,
    );

    // Periodic recovery check — "basic" health-awareness means a transient
    // failure shouldn't permanently exile a replica until the next pod
    // restart. Every 30s, ping any currently-unhealthy replica and flip it
    // back to healthy the moment it responds again.
    this.replicaHealthCheckInterval = setInterval(() => {
      this.recheckUnhealthyReplicas().catch((err) =>
        this.logger.error(`Replica health recheck failed unexpectedly: ${(err as Error).message}`),
      );
    }, 30_000);
  }

  private async recheckUnhealthyReplicas(): Promise<void> {
    const unhealthy = this.replicas.filter((r) => !r.healthy);
    for (const replica of unhealthy) {
      try {
        await replica.client.$queryRaw`SELECT 1`;
        replica.healthy = true;
        this.logger.log(`Read replica (${replica.label}) responded again — marking healthy.`);
      } catch {
        // Still down. Stays unhealthy; will retry again on the next interval.
      }
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.replicaHealthCheckInterval) clearInterval(this.replicaHealthCheckInterval);
    await this.$disconnect();
    await Promise.all(this.replicas.map((r) => r.client.$disconnect()));
  }

  /**
   * Runs a callback inside a managed transaction.
   * Enforces a max-wait and timeout so slow transactions don't starve the pool.
   *
   * Always uses the PRIMARY (write) connection — `this.$transaction` is
   * inherited from the PrismaClient this class extends, never the replica.
   * Transactions exist specifically for writes (or reads that must be
   * consistent with a write in the same unit of work), so routing this to
   * a replica would risk reading stale data against what the transaction
   * itself just wrote.
   */
  async runInTransaction<T>(
    fn: (tx: any) => Promise<T>,
  ): Promise<T> {
    return this.$transaction(fn, {
      maxWait: 5_000,  // ms to wait for a connection from the pool
      timeout: 10_000, // ms before the transaction is automatically rolled back
    });
  }
}
