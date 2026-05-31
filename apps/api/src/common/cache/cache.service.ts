// apps/api/src/common/cache/cache.service.ts — PERFORMANCE OPTIMISED
// Key improvements:
//   1. Stale-while-revalidate semantics: returns cached data immediately, revalidates in bg
//   2. Pattern-based invalidation (prefix or glob-style)
//   3. Periodic eviction to prevent unbounded memory growth
//   4. Size cap (default 2000 entries) with LRU eviction

import { Injectable, OnModuleDestroy, Logger } from '@nestjs/common';

interface Entry<T> {
  value: T;
  revalidateAt: number; // background refresh triggered after this
  expiresAt: number;    // hard expiry
  hits: number;         // for LRU eviction
  lastHit: number;
}

// PERF: default SWR ratio — revalidate after 70 % of TTL
const SWR_RATIO = 0.7;
const MAX_ENTRIES = parseInt(process.env.CACHE_MAX_ENTRIES ?? '2000', 10);

@Injectable()
export class CacheService implements OnModuleDestroy {
  private readonly store = new Map<string, Entry<unknown>>();
  private readonly inflight = new Map<string, Promise<unknown>>();
  private readonly logger = new Logger(CacheService.name);
  private evictTimer: NodeJS.Timeout;

  constructor() {
    // PERF: evict expired entries every 2 minutes
    this.evictTimer = setInterval(() => this.evictExpired(), 2 * 60_000);
  }

  onModuleDestroy() {
    clearInterval(this.evictTimer);
  }

  // ── Core get/set ───────────────────────────────────────────────────────────

  get<T>(key: string): { value: T; stale: boolean } | null {
    const entry = this.store.get(key) as Entry<T> | undefined;
    if (!entry) return null;
    const now = Date.now();
    if (now > entry.expiresAt) { this.store.delete(key); return null; }
    entry.hits++;
    entry.lastHit = now;
    return { value: entry.value, stale: now > entry.revalidateAt };
  }

  set<T>(key: string, value: T, ttlMs = 300_000): void {
    if (this.store.size >= MAX_ENTRIES) this.evictLRU();
    const now = Date.now();
    this.store.set(key, {
      value,
      revalidateAt: now + ttlMs * SWR_RATIO,
      expiresAt:    now + ttlMs,
      hits: 0,
      lastHit: now,
    });
  }

  // PERF: delete by exact key OR by prefix (pass a prefix to bust a whole namespace)
  del(keyOrPrefix: string): void {
    for (const key of this.store.keys()) {
      if (key === keyOrPrefix || key.startsWith(keyOrPrefix)) {
        this.store.delete(key);
      }
    }
  }

  // ── SWR + dedup getOrSet ───────────────────────────────────────────────────
  async getOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    ttlMs = 300_000,
  ): Promise<T> {
    const cached = this.get<T>(key);

    if (cached) {
      if (!cached.stale) return cached.value;

      // PERF: stale-while-revalidate — return immediately, refresh in background
      if (!this.inflight.has(key)) {
        const bg = factory()
          .then(fresh => { this.set(key, fresh, ttlMs); return fresh; })
          .catch(err => {
            this.logger.warn(`Background revalidation failed for "${key}": ${err.message}`);
          })
          .finally(() => this.inflight.delete(key));
        this.inflight.set(key, bg);
      }
      return cached.value;
    }

    // PERF: dedup — if an identical computation is in-flight, await it
    if (this.inflight.has(key)) return this.inflight.get(key) as Promise<T>;

    const fresh = factory()
      .then(value => { this.set(key, value, ttlMs); return value; })
      .finally(() => this.inflight.delete(key));

    this.inflight.set(key, fresh);
    return fresh;
  }

  // ── Eviction helpers ───────────────────────────────────────────────────────

  private evictExpired(): void {
    const now = Date.now();
    let evicted = 0;
    for (const [k, v] of this.store) {
      if (now > v.expiresAt) { this.store.delete(k); evicted++; }
    }
    if (evicted > 0) this.logger.debug(`Evicted ${evicted} expired cache entries`);
  }

  private evictLRU(): void {
    // Remove the 10 % of entries with the oldest lastHit
    const entries = [...this.store.entries()]
      .sort((a, b) => a[1].lastHit - b[1].lastHit);
    const toRemove = Math.max(1, Math.floor(entries.length * 0.1));
    entries.slice(0, toRemove).forEach(([k]) => this.store.delete(k));
  }

  // ── Stats (for monitoring endpoints) ──────────────────────────────────────
  stats() {
    return { size: this.store.size, inflight: this.inflight.size };
  }
}
