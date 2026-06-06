// apps/api/src/common/throttler/throttler-storage.service.ts
//
// Custom ThrottlerStorage backed by the in-process CacheService.
// This replaces NestJS's default in-memory ThrottlerStorage so all
// rate-limit counters share the same LRU store and survive hot-reloads.
//
// If you add Redis in future, swap CacheService.get/set calls for
// ioredis INCR + EXPIRE — the ThrottlerStorage interface stays the same.

import { Injectable } from '@nestjs/common';
import { ThrottlerStorage } from '@nestjs/throttler';
import { CacheService } from '../cache/cache.service';

export interface ThrottlerStorageRecord {
  totalHits: number;
  timeToExpire: number;
  isBlocked: boolean;
  timeToBlockExpire: number;
}

@Injectable()
export class ThrottlerStorageService implements ThrottlerStorage {
  constructor(private readonly cache: CacheService) {}

  async increment(
    key: string,
    ttl: number,
    limit: number,
    blockDuration: number,
    throttlerName: string,
  ): Promise<ThrottlerStorageRecord> {
    const cacheKey = `throttle:${throttlerName}:${key}`;
    const blockKey = `throttle:block:${throttlerName}:${key}`;
    const now = Date.now();

    // ── Check if IP is currently blocked ─────────────────────────────────
    const blockEntry = this.cache.get<number>(blockKey);
    if (blockEntry) {
      return {
        totalHits:       limit + 1,
        timeToExpire:    0,
        isBlocked:       true,
        timeToBlockExpire: Math.ceil((blockEntry.value - now) / 1000),
      };
    }

    // ── Increment hit counter ─────────────────────────────────────────────
    const existing = this.cache.get<{ hits: number; expiresAt: number }>(cacheKey);
    let hits: number;
    let expiresAt: number;

    if (existing) {
      hits      = existing.value.hits + 1;
      expiresAt = existing.value.expiresAt;
      this.cache.set(cacheKey, { hits, expiresAt }, expiresAt - now);
    } else {
      hits      = 1;
      expiresAt = now + ttl;
      this.cache.set(cacheKey, { hits, expiresAt }, ttl);
    }

    // ── Block IP if limit exceeded ────────────────────────────────────────
    const isBlocked = hits > limit;
    if (isBlocked && blockDuration > 0) {
      this.cache.set(blockKey, now + blockDuration, blockDuration);
    }

    return {
      totalHits:        hits,
      timeToExpire:     Math.ceil((expiresAt - now) / 1000),
      isBlocked,
      timeToBlockExpire: isBlocked && blockDuration > 0 ? Math.ceil(blockDuration / 1000) : 0,
    };
  }
}
