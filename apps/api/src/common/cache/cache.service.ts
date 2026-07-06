// apps/api/src/common/cache/cache.service.ts
//
// F1 FIX: Replaced in-process Map with Redis-backed store (ioredis).
//
// F-SEC fix (Prompt 6): this is now the HOT CACHE ONLY — listing/search
// list & detail caches, view counters, and other high-volume,
// eviction-tolerant data. Security-critical state (rate limits, OTP
// counters, token blocklist, upload rate limits, WebSocket presence) has
// moved to CriticalStateService (critical-state.service.ts), which is
// identical in API but backed by a SEPARATE Redis connection — see that
// file's header comment for why, and base-redis-store.ts for the (shared,
// unchanged) get/set/counter/set implementation both classes extend.
//
// Set `maxmemory-policy allkeys-lru` on THIS Redis (see docker-compose.yml /
// apps/k8s/configmap.yaml) — under memory pressure, evicting hot-cache keys
// is fine (they're cheap to recompute); it must never evict
// CriticalStateService's Redis, which uses `noeviction` instead.
//
// Migration notes for callers:
//   • get() / set() / del() are async — add `await` everywhere they are called.
//   • getOrSet() / getOrSetWithLock() were already async — no signature change.
//   • getStats() is async.

import { Injectable } from '@nestjs/common';
import { BaseRedisStore, CacheEntry } from './base-redis-store';

// Re-export so callers that typed against the old shape continue to compile.
export type { CacheEntry };

@Injectable()
export class CacheService extends BaseRedisStore {
  constructor() {
    const url = process.env.REDIS_URL;
    if (!url) {
      throw new Error('REDIS_URL environment variable is required (CacheService)');
    }
    super(url, undefined, CacheService.name);
  }
}
