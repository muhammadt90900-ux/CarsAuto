// apps/api/src/common/throttler/ip-throttle.middleware.ts
import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { CacheService } from '../cache/cache.service';

const ROUTE_LIMITS: Array<{ prefix: string; maxHits: number; windowMs: number }> = [
  { prefix: '/api/auth/login',               maxHits: 10,  windowMs: 60_000       },
  { prefix: '/api/auth/register',            maxHits: 5,   windowMs: 60_000       },
  { prefix: '/api/auth/forgot-password',     maxHits: 5,   windowMs: 15 * 60_000  },
  { prefix: '/api/auth/reset-password',      maxHits: 10,  windowMs: 15 * 60_000  },
  { prefix: '/api/auth/resend-verification', maxHits: 3,   windowMs: 60_000       },
  { prefix: '/api/auth/verify',              maxHits: 10,  windowMs: 60_000       },
  { prefix: '/api/upload',                   maxHits: 30,  windowMs: 60_000       },
  { prefix: '/api/search',                   maxHits: 60,  windowMs: 60_000       },
  { prefix: '/api',                          maxHits: 120, windowMs: 60_000       },
];

const PROGRESSIVE_BLOCKS = [
  { threshold: 3, blockMs: 60_000       },
  { threshold: 6, blockMs: 15 * 60_000  },
  { threshold: 9, blockMs: 60 * 60_000  },
];

@Injectable()
export class IpThrottleMiddleware implements NestMiddleware {
  private readonly logger = new Logger(IpThrottleMiddleware.name);
  private readonly trustProxy = process.env.TRUST_PROXY === 'true';

  constructor(private readonly cache: CacheService) {}

  use(req: Request, res: Response, next: NextFunction): void {
    this.handle(req, res, next).catch((err: unknown) => {
      this.logger.error('IpThrottleMiddleware error', err);
      next();
    });
  }

  private async handle(req: Request, res: Response, next: NextFunction): Promise<void> {
    const ip = this.extractIp(req);
    if (!ip) return next();

    const config = (ROUTE_LIMITS.find(r => req.path.startsWith(r.prefix))
      ?? ROUTE_LIMITS[ROUTE_LIMITS.length - 1])!;

    const windowKey = `ip:window:${config.prefix}:${ip}`;
    const strikeKey = `ip:strikes:${ip}`;
    const blockKey  = `ip:block:${ip}`;
    const now       = Date.now();

    // ── Check block ───────────────────────────────────────────────────────
    const block = await this.cache.get<number>(blockKey);
    if (block) {
      const retryAfter = Math.ceil((block.value - now) / 1000);
      this.logger.warn(`Blocked IP ${ip} tried ${req.method} ${req.path}`);
      res.setHeader('Retry-After', String(retryAfter));
      res.setHeader('X-RateLimit-Blocked', 'true');
      res.status(429).json({ statusCode: 429, error: 'Too Many Requests', message: `Rate limit exceeded. Retry after ${retryAfter} seconds.`, retryAfter });
      return;
    }

    // ── Increment sliding window ──────────────────────────────────────────
    const existing = await this.cache.get<{ hits: number; expiresAt: number }>(windowKey);
    let hits: number;
    let expiresAt: number;

    if (existing) {
      hits      = existing.value.hits + 1;
      expiresAt = existing.value.expiresAt;
      await this.cache.set(windowKey, { hits, expiresAt }, expiresAt - now);
    } else {
      hits      = 1;
      expiresAt = now + config.windowMs;
      await this.cache.set(windowKey, { hits, expiresAt }, config.windowMs);
    }

    const remaining = Math.max(0, config.maxHits - hits);
    const resetSecs = Math.ceil((expiresAt - now) / 1000);

    res.setHeader('X-RateLimit-Limit',     String(config.maxHits));
    res.setHeader('X-RateLimit-Remaining', String(remaining));
    res.setHeader('X-RateLimit-Reset',     String(Math.floor(expiresAt / 1000)));

    if (hits > config.maxHits) {
      const strikeEntry = await this.cache.get<number>(strikeKey);
      const strikes = (strikeEntry?.value ?? 0) + 1;
      await this.cache.set(strikeKey, strikes, 24 * 60 * 60_000);

      const blockConfig = [...PROGRESSIVE_BLOCKS].reverse().find(b => strikes >= b.threshold);
      if (blockConfig) {
        await this.cache.set(blockKey, now + blockConfig.blockMs, blockConfig.blockMs);
        this.logger.warn(`IP ${ip} blocked for ${blockConfig.blockMs / 1000}s after ${strikes} strikes (${req.path})`);
      }

      res.setHeader('Retry-After', String(resetSecs));
      res.status(429).json({ statusCode: 429, error: 'Too Many Requests', message: `Rate limit exceeded. Retry after ${resetSecs} seconds.`, retryAfter: resetSecs });
      return;
    }

    next();
  }

  private extractIp(req: Request): string | null {
    if (this.trustProxy) {
      const forwarded = req.headers['x-forwarded-for'];
      if (forwarded) {
        const first = (Array.isArray(forwarded) ? forwarded[0]! : forwarded).split(',')[0]!.trim();
        if (first) return first;
      }
    }
    return req.socket?.remoteAddress ?? (req as any).ip ?? null;
  }
}
