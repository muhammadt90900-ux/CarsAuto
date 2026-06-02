// apps/api/src/common/throttler/ip-throttle.middleware.ts
//
// Express middleware for per-IP rate limiting that runs BEFORE NestJS guards.
// This is intentionally framework-agnostic so it catches traffic that might
// bypass Guard-level throttling (health checks, unmatched routes, etc.).
//
// Strategy:
//   - Sliding-window counter per IP per endpoint-class
//   - Progressive backoff: 3 strikes → 1 min block, 6 strikes → 15 min block
//   - Returns standard RFC 6585 429 with Retry-After header
//   - Trusts X-Forwarded-For only when TRUST_PROXY env is set (avoids IP spoofing)

import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { CacheService } from '../cache/cache.service';

// ── Configuration constants ──────────────────────────────────────────────────

/** Map of URL path prefix → { maxHits, windowMs } */
const ROUTE_LIMITS: Array<{ prefix: string; maxHits: number; windowMs: number }> = [
  // Auth endpoints — tightest limits
  { prefix: '/api/auth/login',               maxHits: 10,  windowMs: 60_000  },
  { prefix: '/api/auth/register',            maxHits: 5,   windowMs: 60_000  },
  { prefix: '/api/auth/forgot-password',     maxHits: 5,   windowMs: 15 * 60_000 },
  { prefix: '/api/auth/reset-password',      maxHits: 10,  windowMs: 15 * 60_000 },
  { prefix: '/api/auth/resend-verification', maxHits: 3,   windowMs: 60_000  },
  // OTP / verify
  { prefix: '/api/auth/verify',              maxHits: 10,  windowMs: 60_000  },
  // Upload endpoints
  { prefix: '/api/upload',                   maxHits: 30,  windowMs: 60_000  },
  // Search endpoints
  { prefix: '/api/search',                   maxHits: 60,  windowMs: 60_000  },
  // General API fallback
  { prefix: '/api',                          maxHits: 120, windowMs: 60_000  },
];

/** After exceeding limit N times, block for this long */
const PROGRESSIVE_BLOCKS = [
  { threshold: 3, blockMs: 60_000        }, // 1 minute
  { threshold: 6, blockMs: 15 * 60_000   }, // 15 minutes
  { threshold: 9, blockMs: 60 * 60_000   }, // 1 hour
];

@Injectable()
export class IpThrottleMiddleware implements NestMiddleware {
  private readonly logger = new Logger(IpThrottleMiddleware.name);
  private readonly trustProxy = process.env.TRUST_PROXY === 'true';

  constructor(private readonly cache: CacheService) {}

  use(req: Request, res: Response, next: NextFunction): void {
    const ip = this.extractIp(req);
    if (!ip) return next(); // no IP → pass through (shouldn't happen)

    // Find the most-specific matching route config
    const config = ROUTE_LIMITS.find(r => req.path.startsWith(r.prefix))
      ?? ROUTE_LIMITS[ROUTE_LIMITS.length - 1]; // fallback to /api

    const windowKey = `ip:window:${config.prefix}:${ip}`;
    const strikeKey = `ip:strikes:${ip}`;
    const blockKey  = `ip:block:${ip}`;
    const now       = Date.now();

    // ── Check block ───────────────────────────────────────────────────────
    const block = this.cache.get<number>(blockKey);
    if (block) {
      const retryAfter = Math.ceil((block.value - now) / 1000);
      this.logger.warn(`Blocked IP ${ip} tried ${req.method} ${req.path}`);
      res.setHeader('Retry-After', String(retryAfter));
      res.setHeader('X-RateLimit-Blocked', 'true');
      res.status(429).json({
        statusCode: 429,
        error:      'Too Many Requests',
        message:    `Rate limit exceeded. Retry after ${retryAfter} seconds.`,
        retryAfter,
      });
      return;
    }

    // ── Increment sliding window ──────────────────────────────────────────
    const existing = this.cache.get<{ hits: number; expiresAt: number }>(windowKey);
    let hits: number;
    let expiresAt: number;

    if (existing) {
      hits      = existing.value.hits + 1;
      expiresAt = existing.value.expiresAt;
      this.cache.set(windowKey, { hits, expiresAt }, expiresAt - now);
    } else {
      hits      = 1;
      expiresAt = now + config.windowMs;
      this.cache.set(windowKey, { hits, expiresAt }, config.windowMs);
    }

    const remaining  = Math.max(0, config.maxHits - hits);
    const resetSecs  = Math.ceil((expiresAt - now) / 1000);

    res.setHeader('X-RateLimit-Limit',     String(config.maxHits));
    res.setHeader('X-RateLimit-Remaining', String(remaining));
    res.setHeader('X-RateLimit-Reset',     String(Math.floor(expiresAt / 1000)));

    if (hits > config.maxHits) {
      // ── Record strike and potentially upgrade block ───────────────────
      const strikeEntry = this.cache.get<number>(strikeKey);
      const strikes = (strikeEntry?.value ?? 0) + 1;
      this.cache.set(strikeKey, strikes, 24 * 60 * 60_000); // keep strikes for 24h

      const blockConfig = [...PROGRESSIVE_BLOCKS]
        .reverse()
        .find(b => strikes >= b.threshold);

      if (blockConfig) {
        const unblockAt = now + blockConfig.blockMs;
        this.cache.set(blockKey, unblockAt, blockConfig.blockMs);
        this.logger.warn(
          `IP ${ip} blocked for ${blockConfig.blockMs / 1000}s after ${strikes} strikes (${req.path})`,
        );
      }

      const retryAfter = resetSecs;
      res.setHeader('Retry-After', String(retryAfter));
      res.status(429).json({
        statusCode: 429,
        error:      'Too Many Requests',
        message:    `Rate limit exceeded. Retry after ${retryAfter} seconds.`,
        retryAfter,
      });
      return;
    }

    next();
  }

  /** Extract real client IP, respecting TRUST_PROXY setting. */
  private extractIp(req: Request): string | null {
    if (this.trustProxy) {
      const forwarded = req.headers['x-forwarded-for'];
      if (forwarded) {
        const first = (Array.isArray(forwarded) ? forwarded[0] : forwarded)
          .split(',')[0]
          .trim();
        if (first) return first;
      }
    }
    return (
      req.socket?.remoteAddress ??
      (req as any).ip ??
      null
    );
  }
}
