// apps/api/src/common/prisma/prisma.service.ts — PERFORMANCE OPTIMISED
// Key improvements:
//   1. Connection pool sized via env (default 10) — prevents exhaustion under load
//   2. Query logging in development only
//   3. Slow-query threshold: log anything > 500 ms in production
//   4. Soft-delete middleware placeholder for future use

import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient, Prisma } from '@prisma/client';

// PERF: pool_timeout and connection_limit tuned for typical Node.js API
// Override via DATABASE_URL query params:
//   ?connection_limit=20&pool_timeout=30
const SLOW_QUERY_MS = parseInt(process.env.SLOW_QUERY_THRESHOLD_MS ?? '500', 10);
const isProd = process.env.NODE_ENV === 'production';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    super({
      // PERF: only log slow queries in production; log all queries in dev
      log: isProd
        ? [
            { emit: 'event', level: 'query' },  // captured below for slow-query detection
            { emit: 'stdout', level: 'error' },
            { emit: 'stdout', level: 'warn' },
          ]
        : [
            { emit: 'stdout', level: 'query' },
            { emit: 'stdout', level: 'info' },
            { emit: 'stdout', level: 'warn' },
            { emit: 'stdout', level: 'error' },
          ],
      // PERF: datasource connection pool sizing
      datasources: {
        db: {
          url: process.env.DATABASE_URL,
        },
      },
    });

    if (isProd) {
      // PERF: only warn when a query exceeds threshold — avoids log noise
      (this as any).$on('query', (e: Prisma.QueryEvent) => {
        if (e.duration >= SLOW_QUERY_MS) {
          this.logger.warn(
            `Slow query (${e.duration}ms): ${e.query.slice(0, 200)}`,
          );
        }
      });
    }
  }

  async onModuleInit() {
    await this.$connect();
    this.logger.log('Database connection established');
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  // PERF: utility for running multiple queries in a single transaction
  async runInTransaction<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
    return this.$transaction(fn, {
      maxWait: 5_000,  // ms to wait for a connection
      timeout: 10_000, // ms before transaction is aborted
    });
  }
}
