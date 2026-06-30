// apps/worker/src/common/prisma/prisma.service.ts  (verbatim copy of apps/api's — see apps/worker/README.md)
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

  constructor() {
    super({
      log: isProd ? PROD_LOG_CONFIG : DEV_LOG_CONFIG,
      datasources: {
        db: { url: process.env.DATABASE_URL },
      },
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

  async onModuleInit(): Promise<void> {
    await this.$connect();
    this.logger.log('Database connection established');
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }

  /**
   * Runs a callback inside a managed transaction.
   * Enforces a max-wait and timeout so slow transactions don't starve the pool.
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
