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

import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

// Pool sizing and slow-query threshold are configurable via env vars.
// Override pool via DATABASE_URL: ?connection_limit=20&pool_timeout=30
const SLOW_QUERY_THRESHOLD_MS = parseInt(
  process.env.SLOW_QUERY_THRESHOLD_MS ?? '500',
  10,
);
const isProd = process.env.NODE_ENV === 'production';

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
   * Read-replica client. Points at DATABASE_READ_URL if set, otherwise at
   * the same DATABASE_URL as the primary (`this`) — meaning with no replica
   * configured, `db('read')` and `db('write')` hit the exact same database
   * and there is no behaviour change whatsoever.
   */
  readonly read: PrismaClient;

  constructor() {
    super({
      log: isProd ? PROD_LOG_CONFIG : DEV_LOG_CONFIG,
      datasources: {
        db: { url: process.env.DATABASE_URL },
      },
    });

    const readUrl = process.env.DATABASE_READ_URL ?? process.env.DATABASE_URL;
    this.read = new PrismaClient({
      datasources: { db: { url: readUrl } },
    });

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
   *   db('read')        → the replica (or primary, if no replica is configured)
   *   db('write') / db() → the primary — same as using `this`/`this.prisma` directly
   *
   * Existing code that calls `this.prisma.<model>.<op>(...)` directly
   * (the vast majority of this codebase) is completely unaffected — this
   * is purely additive for callers that explicitly want the replica.
   */
  db(operation: 'read' | 'write' = 'write'): PrismaClient {
    return operation === 'read' ? this.read : this;
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
    await this.read.$connect();
    this.logger.log('Database connection established (primary + read replica)');
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
    await this.read.$disconnect();
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
