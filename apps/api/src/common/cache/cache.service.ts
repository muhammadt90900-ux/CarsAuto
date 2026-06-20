// apps/api/src/common/cache/cache.service.ts
//
// F1 FIX: Replaced in-process Map with Redis-backed store (ioredis).
//
// Security controls that depend on this service — rate limiting, logout
// blocklist, OTP brute-force protection, and upload-ownership IDOR checks —
// now survive restarts and are shared across all replicas behind a load
// balancer.
//
// Non-security (pure perf) keys such as listing detail SWR caches still
// work identically from the callers' perspective; they simply write to Redis
// instead of a local Map.
//
// Migration notes for callers:
//   • get() / set() / del() are now async — add `await` everywhere they are called.
//   • getOrSet() was already async — no signature change.
//   • getStats() is now async.
//   • ThrottlerStorageService, OtpProtectionService, IpThrottleMiddleware,
//     and UploadController all call get/set synchronously today and must be
//     updated to use `await`.

import { Injectable, OnModuleDestroy, Logger } from '@nestjs/common';
import Redis from 'ioredis';

// Re-export so callers that typed against the old shape continue to compile.
export interface CacheEntry<T> {
  value: T;
  stale: boolean;
}

@Injectable()
export class CacheService implements OnModuleDestroy {
  private readonly redis: Redis;
  private readonly logger = new Logger(CacheService.name);

  constructor() {
    const url = process.env.REDIS_URL;
    if (!url) {
      throw new Error('REDIS_URL environment variable is required (CacheService)');
    }
    this.redis = new Redis(url, {
      // Fail fast so startup health checks catch misconfiguration immediately.
      enableOfflineQueue: false,
      lazyConnect: false,
      // Reconnect strategy: exponential back-off up to 30 s.
      retryStrategy: (times) => Math.min(times * 200, 30_000),
    });

    this.redis.on('error', (err: Error) => {
      this.logger.error(`Redis connection error: ${err.message}`);
    });

    this.redis.on('ready', () => {
      this.logger.log('Redis connection established');
    });
  }

  onModuleDestroy(): void {
    this.redis.disconnect();
  }

  // ── Core get/set/del ──────────────────────────────────────────────────────

  /**
   * Get a cached value.
   * Returns `{ value, stale: false }` on a hit, or `null` on a miss.
   *
   * NOTE: Redis TTL-based expiry replaces the old SWR "stale" flag.
   * stale is always false here; callers that relied on stale-while-revalidate
   * should implement their own background refresh above this layer.
   */
  async get<T>(key: string): Promise<{ value: T; stale: boolean } | null> {
    if (!key || typeof key !== 'string') return null;

    try {
      const raw = await this.redis.get(key);
      if (raw === null) return null;
      return { value: JSON.parse(raw) as T, stale: false };
    } catch (err) {
      this.logger.error(`CacheService.get("${key}") failed: ${(err as Error).message}`);
      return null;
    }
  }

  /**
   * Set a cached value with TTL (milliseconds, default 5 minutes).
   */
  async set<T>(key: string, value: T, ttlMs = 300_000): Promise<void> {
    if (!key || typeof key !== 'string') return;

    try {
      await this.redis.set(key, JSON.stringify(value), 'PX', ttlMs);
    } catch (err) {
      this.logger.error(`CacheService.set("${key}") failed: ${(err as Error).message}`);
    }
  }

  /**
   * Delete by exact key OR by prefix (appends `*` glob for SCAN-based deletion).
   * Returns the number of keys deleted.
   */
  async del(keyOrPrefix: string): Promise<number> {
    if (!keyOrPrefix || typeof keyOrPrefix !== 'string') return 0;

    try {
      // Exact match first.
      const exact = await this.redis.del(keyOrPrefix);

      // Then sweep any prefix-matched keys (e.g. "upload:owner:" namespace).
      const prefixPattern = `${keyOrPrefix}*`;
      const keys: string[] = [];
      let cursor = '0';

      do {
        const [nextCursor, batch] = await this.redis.scan(
          cursor,
          'MATCH',
          prefixPattern,
          'COUNT',
          100,
        );
        cursor = nextCursor;
        keys.push(...batch);
      } while (cursor !== '0');

      // De-duplicate (exact key may have been caught by both paths).
      const unique = [...new Set(keys)];
      if (unique.length === 0) return exact;

      const prefixDeleted = await this.redis.del(...unique);
      return exact + prefixDeleted;
    } catch (err) {
      this.logger.error(`CacheService.del("${keyOrPrefix}") failed: ${(err as Error).message}`);
      return 0;
    }
  }

  // ── getOrSet helper ───────────────────────────────────────────────────────

  /**
   * Get or set with factory function.
   * If the key is missing, calls factory(), caches the result, and returns it.
   * No SWR/background-revalidate in this implementation — simplicity is
   * preferable here given the security contexts this method is used in.
   */
  async getOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    ttlMs = 300_000,
  ): Promise<T> {
    if (!key || typeof key !== 'string' || !factory) {
      throw new Error('Invalid getOrSet parameters');
    }

    const cached = await this.get<T>(key);
    if (cached) return cached.value;

    const value = await factory();
    await this.set(key, value, ttlMs);
    return value;
  }

  // ── Stats ─────────────────────────────────────────────────────────────────

  /**
   * Returns basic Redis info for monitoring endpoints.
   */
  async getStats(): Promise<{ connected: boolean; dbSize: number }> {
    try {
      const dbSize = await this.redis.dbsize();
      return { connected: true, dbSize };
    } catch {
      return { connected: false, dbSize: 0 };
    }
  }
}
