// apps/api/src/common/cache/critical-state.service.ts
//
// F-SEC fix (Prompt 6): security-critical, must-not-be-evicted state — rate
// limit counters, OTP brute-force counters, access-token blocklist, upload
// rate limits, WebSocket rate limits + presence/room-membership sets — now
// lives on its OWN Redis connection, separate from CacheService's hot
// listing/search cache.
//
// Why this needed splitting: under memory pressure or heavy cache churn on
// the hot-cache Redis, `allkeys-lru` eviction can legitimately evict ANY
// key — including, if they shared one keyspace, an active rate-limit
// counter or a blocklisted-token entry. Evicting a token from the logout
// blocklist early means a revoked token becomes usable again; evicting an
// IP's block-counter early means a brute-force lockout resets itself. This
// Redis connection is configured `maxmemory-policy noeviction` instead (see
// docker-compose.yml / apps/k8s/configmap.yaml) — it fails loudly (OOM
// errors, caught and logged by BaseRedisStore's try/catch, failing safe per
// each caller's existing fail-open/fail-closed choice) rather than silently
// dropping security state.
//
// ── Connection topology (configurable — GJ: decide per environment) ────────
// If CRITICAL_REDIS_URL is set, this connects to a fully separate Redis
// instance/service. If not set, it falls back to REDIS_URL (the same
// physical instance CacheService uses) but on a DIFFERENT logical DB index
// (CRITICAL_REDIS_DB, default 1 — Redis's default db 0 is what CacheService
// implicitly uses when no db is specified in REDIS_URL), so the two are still
// logically isolated keyspaces even sharing one instance. Neither path
// requires code changes elsewhere — only env vars.
//
// Used by: ThrottlerStorageService, OtpProtectionService,
// IpThrottleMiddleware, SearchProtectionService, UploadController's rate
// limits, AuthService's token blocklist / revocation floor, and
// ChatGateway's wsrl:/voicerl:/online: keys (NOT typing: — that stays on the
// regular hot cache; losing a typing indicator under memory pressure is a
// harmless UX blip, not a security concern).

import { Injectable } from '@nestjs/common';
import { BaseRedisStore } from './base-redis-store';

@Injectable()
export class CriticalStateService extends BaseRedisStore {
  constructor() {
    // Guard against an empty string (e.g. a k8s Secret set to "" rather than
    // omitted) being treated as "set" — `?? ` alone only falls back on
    // null/undefined, not on "".
    const criticalUrl = process.env.CRITICAL_REDIS_URL?.trim() || undefined;
    const baseUrl = criticalUrl ?? process.env.REDIS_URL;
    if (!baseUrl) {
      throw new Error(
        'CRITICAL_REDIS_URL or REDIS_URL environment variable is required (CriticalStateService)',
      );
    }
    // Only apply a db-index override in the shared-instance fallback path —
    // a dedicated CRITICAL_REDIS_URL is already its own isolated instance,
    // so there's no need to also carve out a sub-db on it.
    const dbIndex = criticalUrl ? undefined : parseInt(process.env.CRITICAL_REDIS_DB ?? '1', 10);
    super(baseUrl, dbIndex, CriticalStateService.name);
  }
}
