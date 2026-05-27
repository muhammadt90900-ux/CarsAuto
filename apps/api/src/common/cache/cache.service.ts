// apps/api/src/common/cache/cache.service.ts
// Lightweight in-process TTL cache. Keyed by string; values are any.
// Used for vehicle brands/models (effectively static) and listing pages.

import { Injectable } from '@nestjs/common';

interface Entry<T> {
  value: T;
  expiresAt: number;
}

@Injectable()
export class CacheService {
  private readonly store = new Map<string, Entry<unknown>>();

  /** Get a cached value, or null if missing/expired. */
  get<T>(key: string): T | null {
    const entry = this.store.get(key) as Entry<T> | undefined;
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return entry.value;
  }

  /** Store a value with a TTL in milliseconds (default 5 min). */
  set<T>(key: string, value: T, ttlMs = 300_000): void {
    this.store.set(key, { value, expiresAt: Date.now() + ttlMs });
  }

  /** Invalidate a single key or all keys matching a prefix. */
  del(keyOrPrefix: string): void {
    for (const key of this.store.keys()) {
      if (key.startsWith(keyOrPrefix)) this.store.delete(key);
    }
  }

  /**
   * Cache-aside helper. If the key is cached return it; otherwise call
   * `factory`, cache the result, and return it.
   */
  async getOrSet<T>(key: string, factory: () => Promise<T>, ttlMs = 300_000): Promise<T> {
    const cached = this.get<T>(key);
    if (cached !== null) return cached;
    const value = await factory();
    this.set(key, value, ttlMs);
    return value;
  }
}
