/**
 * apps/api/src/common/ai/ai-cache.service.ts
 *
 * Prompt 1, Step 1: shared AI cache wrapper.
 *
 * Deliberately does NOT open a second Redis connection — it composes the
 * existing, already-configured CacheService (apps/api/src/common/cache),
 * which is @Global()-provided from AppCacheModule and backed by the "hot
 * cache" Redis instance (allkeys-lru, eviction-tolerant — appropriate for
 * AI results, which are cheap-ish to regenerate compared to rate-limit /
 * OTP state in CriticalStateService).
 *
 * get<T>/set<T> intentionally mirror CacheService's own signatures 1:1 so
 * callers reason about TTLs the same way everywhere else in the codebase.
 */

import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';
import { CacheService } from '../cache/cache.service';

@Injectable()
export class AiCacheService {
  constructor(private readonly cache: CacheService) {}

  /**
   * Get a cached AI result. Returns null on a miss (or on any Redis error —
   * CacheService already fails closed-to-null internally, never throws).
   */
  async get<T>(key: string): Promise<T | null> {
    const entry = await this.cache.get<T>(key);
    return entry ? entry.value : null;
  }

  /**
   * Cache an AI result.
   * @param ttlSeconds default 1 hour — callers pass their own TTL for
   *   longer-lived results (e.g. Prompt 2's 7-day smart-search parse cache).
   */
  async set<T>(key: string, value: T, ttlSeconds = 3600): Promise<void> {
    await this.cache.set(key, value, ttlSeconds * 1000);
  }

  /**
   * Builds a stable cache key from arbitrary parts.
   *
   * - Short, human-readable parts (feature names, locales, ids) are joined
   *   as-is so keys stay debuggable in `redis-cli --scan`.
   * - Anything that would make the key unwieldy or non-deterministic in
   *   shape (long free-text queries, JSON blobs, arrays/objects) should be
   *   pre-hashed by the caller OR passed through hashPart() below before
   *   being included here — hashKey() itself just joins + namespaces.
   *
   * Example: hashKey('ai', 'search', 'parse', hashPart(normalizedQuery))
   *   → "ai:search:parse:3f9a2e1c8b7d4f60"
   */
  hashKey(...parts: string[]): string {
    const clean = parts
      .filter((p) => p !== undefined && p !== null && p !== '')
      .map((p) => String(p));
    return clean.join(':');
  }

  /**
   * Hashes a single arbitrary-length string (e.g. a raw user query, or a
   * JSON.stringify'd object) down to a short, fixed-length, deterministic
   * token suitable for use as one segment inside hashKey().
   */
  hashPart(value: string): string {
    return crypto.createHash('sha256').update(value).digest('hex').slice(0, 16);
  }
}
