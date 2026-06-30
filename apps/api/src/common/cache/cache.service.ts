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

  // ── Existence ─────────────────────────────────────────────────────────────

  async exists(key: string): Promise<boolean> {
    if (!key) return false;
    try {
      return (await this.redis.exists(key)) === 1;
    } catch (err) {
      this.logger.error(`CacheService.exists("${key}") failed: ${(err as Error).message}`);
      return false;
    }
  }

  // ── Set helpers (presence, room membership) ──────────────────────────────
  //
  // F-CRIT fix: replaces module-level `Map<string, Set<string>>` presence
  // tracking. Redis SETs naturally support multi-membership (multiple socket
  // ids per user) and an empty set is auto-deleted by Redis after the last
  // SREM, so callers can rely on `exists()`/`setCardinality()` for "is online"
  // checks without manual cleanup.

  /** Adds `member` to the set at `key` and (re)applies the TTL — used as a presence heartbeat. */
  async addToSet(key: string, member: string, ttlMs?: number): Promise<void> {
    if (!key || !member) return;
    try {
      await this.redis.sadd(key, member);
      if (ttlMs) await this.redis.pexpire(key, ttlMs);
    } catch (err) {
      this.logger.error(`CacheService.addToSet("${key}") failed: ${(err as Error).message}`);
    }
  }

  /** Removes `member` from the set at `key`. Returns the number removed (0 or 1). */
  async removeFromSet(key: string, member: string): Promise<number> {
    if (!key || !member) return 0;
    try {
      return await this.redis.srem(key, member);
    } catch (err) {
      this.logger.error(`CacheService.removeFromSet("${key}") failed: ${(err as Error).message}`);
      return 0;
    }
  }

  async setMembers(key: string): Promise<string[]> {
    if (!key) return [];
    try {
      return await this.redis.smembers(key);
    } catch (err) {
      this.logger.error(`CacheService.setMembers("${key}") failed: ${(err as Error).message}`);
      return [];
    }
  }

  async setCardinality(key: string): Promise<number> {
    if (!key) return 0;
    try {
      return await this.redis.scard(key);
    } catch (err) {
      this.logger.error(`CacheService.setCardinality("${key}") failed: ${(err as Error).message}`);
      return 0;
    }
  }

  // ── Counters ──────────────────────────────────────────────────────────────
  //
  // F-CRIT fix: replaces module-level rate-limiter Maps and the view-count
  // buffer Map. INCR/INCRBY are atomic in Redis, so concurrent requests
  // across replicas never lose an increment the way two replicas each
  // mutating their own in-memory Map would.

  /**
   * Atomically increments a fixed-window counter, applying `ttlMs` only on
   * the first increment of the window (so the window doesn't keep sliding).
   * Returns the new count. Used for rate limiting.
   *
   * Fails OPEN on Redis errors (returns 0, i.e. "not yet over limit") —
   * a Redis outage should degrade availability gracefully rather than lock
   * every user out of chat.
   */
  async incrWithTtl(key: string, ttlMs: number): Promise<number> {
    if (!key) return 0;
    try {
      const count = await this.redis.incr(key);
      if (count === 1) await this.redis.pexpire(key, ttlMs);
      return count;
    } catch (err) {
      this.logger.error(`CacheService.incrWithTtl("${key}") failed: ${(err as Error).message}`);
      return 0;
    }
  }

  /** Atomically increments a permanent (no-TTL) counter by `amount`. Used for batched view counts. */
  async incrBy(key: string, amount: number): Promise<number> {
    if (!key) return 0;
    try {
      return await this.redis.incrby(key, amount);
    } catch (err) {
      this.logger.error(`CacheService.incrBy("${key}") failed: ${(err as Error).message}`);
      return 0;
    }
  }

  /**
   * Atomically reads and deletes a key in one round trip (Redis GETDEL).
   * Used by batch-flush jobs so that, if two replicas race to flush the same
   * key, only one of them gets a non-null value — the other safely sees null
   * instead of double-counting.
   */
  async getDel(key: string): Promise<string | null> {
    if (!key) return null;
    try {
      return await this.redis.getdel(key);
    } catch (err) {
      this.logger.error(`CacheService.getDel("${key}") failed: ${(err as Error).message}`);
      return null;
    }
  }

  /** Lists all keys matching a glob pattern via non-blocking SCAN (safe on large keyspaces, unlike KEYS). */
  async keys(pattern: string): Promise<string[]> {
    if (!pattern) return [];
    const found: string[] = [];
    let cursor = '0';
    try {
      do {
        const [nextCursor, batch] = await this.redis.scan(
          cursor,
          'MATCH',
          pattern,
          'COUNT',
          200,
        );
        cursor = nextCursor;
        found.push(...batch);
      } while (cursor !== '0');
    } catch (err) {
      this.logger.error(`CacheService.keys("${pattern}") failed: ${(err as Error).message}`);
    }
    return found;
  }
}