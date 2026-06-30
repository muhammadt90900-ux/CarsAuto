// apps/api/src/modules/listings/tasks/view-flush.task.ts
//
// F-CRIT fix: replaces the old module-level `viewBuffer` Map + setTimeout
// loop in listings.service.ts, which only flushed views recorded on a
// single replica's local memory.
//
// Listing detail views are now incremented atomically in Redis
// (`views:{listingId}`, via CacheService.incrBy) by ListingsService. This
// task runs on EVERY replica every 30 s, scans for `views:*` keys, and uses
// Redis GETDEL to atomically read-and-delete each key. GETDEL is atomic, so
// if two replicas' flush jobs race on the same key, only one of them gets a
// non-null value back — the other sees null and safely skips it. No view is
// ever double-counted or dropped between replicas.

import { Injectable, Logger } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { CacheService } from '../../../common/cache/cache.service';

const VIEW_KEY_PATTERN = 'views:*';
const FLUSH_INTERVAL_MS = 30_000;

@Injectable()
export class ViewFlushTask {
  private readonly logger = new Logger(ViewFlushTask.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
  ) {}

  @Interval(FLUSH_INTERVAL_MS)
  async flushViews(): Promise<void> {
    let keys: string[];
    try {
      keys = await this.cache.keys(VIEW_KEY_PATTERN);
    } catch (err) {
      this.logger.error(`Failed to scan view keys: ${(err as Error).message}`);
      return;
    }

    if (keys.length === 0) return;

    const results = await Promise.allSettled(
      keys.map(async (key) => {
        // Atomic read+delete — if another replica's flush job already
        // claimed this key, getDel() returns null here and we skip it.
        const raw = await this.cache.getDel(key);
        if (raw === null) return;

        const count = Number.parseInt(raw, 10);
        if (!Number.isFinite(count) || count <= 0) return;

        const listingId = key.slice('views:'.length);
        await this.prisma.listing
          .update({ where: { id: listingId }, data: { views: { increment: count } } })
          .catch(() => {/* listing may have been deleted since the view was recorded */});
      }),
    );

    const failed = results.filter((r) => r.status === 'rejected').length;
    if (failed > 0) {
      this.logger.warn(`View flush: ${failed}/${keys.length} keys failed to process`);
    }
  }
}
