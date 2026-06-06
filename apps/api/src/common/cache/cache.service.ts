// apps/api/src/common/cache/cache.service.ts — PERFORMANCE OPTIMISED
// Key improvements:
//   1. Stale-while-revalidate semantics: returns cached data immediately, revalidates in bg
//   2. Pattern-based invalidation (prefix matching)
//   3. Periodic eviction to prevent unbounded memory growth
//   4. Size cap (default 2000 entries) with LRU eviction
//   5. Type-safe with proper error handling

import { Injectable, OnModuleDestroy, Logger } from '@nestjs/common';

interface CacheEntry<T> {
  value: T;
  revalidateAt: number; // background refresh triggered after this timestamp
  expiresAt: number; // hard expiry timestamp
  hits: number; // hit count for LRU eviction
  lastHit: number; // last access time
}

// PERF: default SWR ratio — revalidate after 70% of TTL
const SWR_RATIO = 0.7;
const MAX_ENTRIES = parseInt(process.env.CACHE_MAX_ENTRIES ?? '2000', 10);
const EVICTION_INTERVAL_MS = 2 * 60_000; // 2 minutes
const LRU_EVICTION_PERCENTAGE = 0.1; // Evict bottom 10%

@Injectable()
export class CacheService implements OnModuleDestroy {
  private readonly store = new Map<string, CacheEntry<unknown>>();
  private readonly inflight = new Map<string, Promise<unknown>>();
  private readonly logger = new Logger(CacheService.name);
  private evictTimer?: NodeJS.Timeout;

  constructor() {
    // PERF: evict expired entries periodically
    this.evictTimer = setInterval(() => this.evictExpired(), EVICTION_INTERVAL_MS);
  }

  onModuleDestroy() {
    if (this.evictTimer) {
      clearInterval(this.evictTimer);
    }
  }

  // ── Core get/set ───────────────────────────────────────────────────────────

  /**
   * Get a cached value.
   * @returns { value, stale } or null if not found or expired
   */
  get<T>(key: string): { value: T; stale: boolean } | null {
    if (!key || typeof key !== 'string') {
      return null;
    }

    const entry = this.store.get(key) as CacheEntry<T> | undefined;
    if (!entry) return null;

    const now = Date.now();
    if (now > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }

    entry.hits++;
    entry.lastHit = now;
    return { value: entry.value, stale: now > entry.revalidateAt };
  }

  /**
   * Set a cached value with TTL.
   */
  set<T>(key: string, value: T, ttlMs = 300_000): void {
    if (!key || typeof key !== 'string') {
      return;
    }

    if (this.store.size >= MAX_ENTRIES) {
      this.evictLRU();
    }

    const now = Date.now();
    this.store.set(key, {
      value,
      revalidateAt: now + ttlMs * SWR_RATIO,
      expiresAt: now + ttlMs,
      hits: 0,
      lastHit: now,
    });
  }

  /**
   * Delete by exact key OR by prefix (pass a prefix to bust a whole namespace).
   */
  del(keyOrPrefix: string): number {
    if (!keyOrPrefix || typeof keyOrPrefix !== 'string') {
      return 0;
    }

    let deleted = 0;
    for (const key of this.store.keys()) {
      if (key === keyOrPrefix || key.startsWith(keyOrPrefix)) {
        this.store.delete(key);
        deleted++;
      }
    }
    return deleted;
  }

  // ── SWR + dedup getOrSet ───────────────────────────────────────────────────

  /**
   * Get or set with factory function.
   * Implements stale-while-revalidate: returns stale data immediately,
   * revalidates in background.
   */
  async getOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    ttlMs = 300_000,
  ): Promise<T> {
    if (!key || typeof key !== 'string' || !factory) {
      throw new Error('Invalid getOrSet parameters');
    }

    const cached = this.get<T>(key);

    if (cached) {
      if (!cached.stale) {
        return cached.value;
      }

      // PERF: stale-while-revalidate — return immediately, refresh in background
      if (!this.inflight.has(key)) {
        const bg = factory()
          .then((fresh) => {
            this.set(key, fresh, ttlMs);
            return fresh;
          })
          .catch((err) => {
            this.logger.warn(
              `Background revalidation failed for "${key}": ${err?.message || 'unknown error'}`,
            );
          })
          .finally(() => this.inflight.delete(key));
        this.inflight.set(key, bg);
      }
      return cached.value;
    }

    // PERF: dedup — if an identical computation is in-flight, await it
    if (this.inflight.has(key)) {
      return this.inflight.get(key) as Promise<T>;
    }

    const fresh = factory()
      .then((value) => {
        this.set(key, value, ttlMs);
        return value;
      })
      .catch((err) => {
        this.logger.error(
          `Failed to compute value for "${key}": ${err?.message || 'unknown error'}`,
        );
        throw err;
      })
      .finally(() => this.inflight.delete(key));

    this.inflight.set(key, fresh);
    return fresh;
  }

  // ── Eviction helpers ───────────────────────────────────────────────────────

  /**
   * Remove all expired entries.
   */
  private evictExpired(): void {
    const now = Date.now();
    let evicted = 0;

    for (const [k, v] of this.store) {
      if (now > v.expiresAt) {
        this.store.delete(k);
        evicted++;
      }
    }

    if (evicted > 0) {
      this.logger.debug(`Evicted ${evicted} expired cache entries`);
    }
  }

  /**
   * Evict least-recently-used entries to maintain size cap.
   */
  private evictLRU(): void {
    const entries = [...this.store.entries()].sort(
      (a, b) => a[1].lastHit - b[1].lastHit,
    );
    const toRemove = Math.max(1, Math.floor(entries.length * LRU_EVICTION_PERCENTAGE));
    let evicted = 0;

    entries.slice(0, toRemove).forEach(([k]) => {
      this.store.delete(k);
      evicted++;
    });

    if (evicted > 0) {
      this.logger.debug(`LRU evicted ${evicted} cache entries`);
    }
  }

  // ── Stats (for monitoring endpoints) ───────────────────────────────────────

  /**
   * Get cache statistics for monitoring.
   */
  getStats() {
    return {
      size: this.store.size,
      inflight: this.inflight.size,
      maxSize: MAX_ENTRIES,
    };
  }
}
