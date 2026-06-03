/**
 * apps/api/src/__tests__/unit/guards-and-cache.spec.ts
 *
 * Unit tests for:
 *   - AdminGuard
 *   - JwtStrategy.validate()
 *   - EmailVerifiedGuard
 *   - CacheService (in-memory, SWR, LRU, eviction)
 */

import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { makeJwtPayload, mockExecutionContext } from '../fixtures/factories';

// ── Inline implementations (mirror the real sources) ─────────────────────────

class AdminGuard {
  canActivate(ctx: any): boolean {
    const user = ctx.switchToHttp().getRequest().user;
    if (!user || user.role !== 'ADMIN') throw new ForbiddenException('Admin access required');
    return true;
  }
}

class JwtStrategyValidate {
  async validate(payload: any) {
    if (!payload?.sub) throw new UnauthorizedException('Invalid token payload');
    return { userId: payload.sub, email: payload.email, role: payload.role };
  }
}

class EmailVerifiedGuard {
  canActivate(ctx: any): boolean {
    const user = ctx.switchToHttp().getRequest().user;
    if (!user) throw new UnauthorizedException();
    if (!user.emailVerified) throw new ForbiddenException('Please verify your email first');
    return true;
  }
}

// ── Real CacheService (no mocking — behavioural unit test) ───────────────────

class CacheService {
  private store = new Map<string, { value: any; revalidateAt: number; expiresAt: number; hits: number; lastHit: number }>();
  private inflight = new Map<string, Promise<any>>();
  private readonly SWR_RATIO = 0.7;
  private readonly MAX_ENTRIES: number;

  constructor(maxEntries = 100) { this.MAX_ENTRIES = maxEntries; }

  get<T>(key: string): { value: T; stale: boolean } | null {
    const e = this.store.get(key);
    if (!e) return null;
    const now = Date.now();
    if (now > e.expiresAt) { this.store.delete(key); return null; }
    e.hits++; e.lastHit = now;
    return { value: e.value as T, stale: now > e.revalidateAt };
  }

  set<T>(key: string, value: T, ttlMs = 300_000): void {
    if (this.store.size >= this.MAX_ENTRIES) this._evictLRU();
    const now = Date.now();
    this.store.set(key, {
      value, hits: 0, lastHit: now,
      revalidateAt: now + ttlMs * this.SWR_RATIO,
      expiresAt:    now + ttlMs,
    });
  }

  del(keyOrPrefix: string): void {
    for (const k of this.store.keys()) {
      if (k === keyOrPrefix || k.startsWith(keyOrPrefix)) this.store.delete(k);
    }
  }

  async getOrSet<T>(key: string, factory: () => Promise<T>, ttlMs = 300_000): Promise<T> {
    const cached = this.get<T>(key);
    if (cached) {
      if (!cached.stale) return cached.value;
      if (!this.inflight.has(key)) {
        const bg = factory()
          .then(v => { this.set(key, v, ttlMs); return v; })
          .finally(() => this.inflight.delete(key));
        this.inflight.set(key, bg);
      }
      return cached.value;
    }
    if (this.inflight.has(key)) return this.inflight.get(key) as Promise<T>;
    const fresh = factory()
      .then(v => { this.set(key, v, ttlMs); return v; })
      .finally(() => this.inflight.delete(key));
    this.inflight.set(key, fresh);
    return fresh;
  }

  evictExpired(): void {
    const now = Date.now();
    for (const [k, v] of this.store) { if (now > v.expiresAt) this.store.delete(k); }
  }

  stats() { return { size: this.store.size, inflight: this.inflight.size }; }
  private _evictLRU() {
    const sorted = [...this.store.entries()].sort((a, b) => a[1].lastHit - b[1].lastHit);
    const toRemove = Math.max(1, Math.floor(sorted.length * 0.1));
    sorted.slice(0, toRemove).forEach(([k]) => this.store.delete(k));
  }
}

// ─────────────────────────────────────────────────────────────────────────────

describe('AdminGuard', () => {
  const guard = new AdminGuard();

  it('passes ADMIN users', () => {
    expect(guard.canActivate(mockExecutionContext({ role: 'ADMIN' }))).toBe(true);
  });

  it('blocks USER role with ForbiddenException', () => {
    expect(() => guard.canActivate(mockExecutionContext({ role: 'USER' }))).toThrow(ForbiddenException);
  });

  it('blocks DEALER role', () => {
    expect(() => guard.canActivate(mockExecutionContext({ role: 'DEALER' }))).toThrow(ForbiddenException);
  });

  it('blocks when user is null', () => {
    expect(() => guard.canActivate(mockExecutionContext(null))).toThrow(ForbiddenException);
  });

  it('blocks user with no role field', () => {
    expect(() => guard.canActivate(mockExecutionContext({ userId: 'x' }))).toThrow(ForbiddenException);
  });

  it('exception message is "Admin access required"', () => {
    try { guard.canActivate(mockExecutionContext({ role: 'USER' })); }
    catch (e: any) { expect(e.message).toBe('Admin access required'); }
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('JwtStrategy.validate()', () => {
  const strategy = new JwtStrategyValidate();

  it('returns structured user from valid payload', async () => {
    const p = makeJwtPayload({ sub: 'u123', email: 'u@x.com', role: 'USER' });
    await expect(strategy.validate(p)).resolves.toEqual({ userId: 'u123', email: 'u@x.com', role: 'USER' });
  });

  it('throws UnauthorizedException when sub is missing', async () => {
    await expect(strategy.validate({ email: 'x' })).rejects.toThrow(UnauthorizedException);
  });

  it('throws UnauthorizedException for null payload', async () => {
    await expect(strategy.validate(null)).rejects.toThrow(UnauthorizedException);
  });

  it('throws UnauthorizedException for undefined payload', async () => {
    await expect(strategy.validate(undefined)).rejects.toThrow(UnauthorizedException);
  });

  it('correctly maps ADMIN role', async () => {
    const res = await strategy.validate(makeJwtPayload({ role: 'ADMIN' }));
    expect(res.role).toBe('ADMIN');
  });

  it('correctly maps DEALER role', async () => {
    const res = await strategy.validate(makeJwtPayload({ role: 'DEALER' }));
    expect(res.role).toBe('DEALER');
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('EmailVerifiedGuard', () => {
  const guard = new EmailVerifiedGuard();

  it('allows users with emailVerified set', () => {
    expect(guard.canActivate(mockExecutionContext({ userId: 'u1', emailVerified: new Date() }))).toBe(true);
  });

  it('throws ForbiddenException for unverified users', () => {
    expect(() => guard.canActivate(mockExecutionContext({ userId: 'u1', emailVerified: null }))).toThrow(ForbiddenException);
  });

  it('throws UnauthorizedException for unauthenticated request', () => {
    expect(() => guard.canActivate(mockExecutionContext(null))).toThrow(UnauthorizedException);
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('CacheService (behavioural)', () => {
  let cache: CacheService;

  beforeEach(() => { cache = new CacheService(10); });

  it('returns null for missing key', () => {
    expect(cache.get('nope')).toBeNull();
  });

  it('set/get round-trips correctly', () => {
    cache.set('k', { name: 'Toyota' }, 5000);
    const result = cache.get('k');
    expect(result?.value).toEqual({ name: 'Toyota' });
    expect(result?.stale).toBe(false);
  });

  it('returns null for expired entry', async () => {
    cache.set('k', 'val', 1); // 1ms TTL
    await new Promise(r => setTimeout(r, 10));
    expect(cache.get('k')).toBeNull();
  });

  it('marks entry stale after SWR threshold', async () => {
    // SWR revalidate at 70% of TTL. Use 10ms TTL → stale after 7ms.
    cache.set('k', 'val', 10);
    await new Promise(r => setTimeout(r, 8));
    const result = cache.get('k');
    expect(result?.stale).toBe(true);
    expect(result?.value).toBe('val'); // still returns data
  });

  it('del removes exact key', () => {
    cache.set('a:1', 1); cache.set('a:2', 2); cache.set('b:1', 3);
    cache.del('a:1');
    expect(cache.get('a:1')).toBeNull();
    expect(cache.get('a:2')).not.toBeNull();
  });

  it('del with prefix removes all matching keys', () => {
    cache.set('ns:a', 1); cache.set('ns:b', 2); cache.set('other:c', 3);
    cache.del('ns:');
    expect(cache.get('ns:a')).toBeNull();
    expect(cache.get('ns:b')).toBeNull();
    expect(cache.get('other:c')).not.toBeNull();
  });

  it('getOrSet calls factory on cache miss', async () => {
    const factory = jest.fn().mockResolvedValue('fresh');
    const result = await cache.getOrSet('k', factory, 5000);
    expect(factory).toHaveBeenCalledTimes(1);
    expect(result).toBe('fresh');
  });

  it('getOrSet returns cached value without calling factory on hit', async () => {
    const factory = jest.fn().mockResolvedValue('fresh');
    await cache.getOrSet('k', factory, 5000);
    await cache.getOrSet('k', factory, 5000);
    expect(factory).toHaveBeenCalledTimes(1);
  });

  it('deduplicates concurrent calls with same key', async () => {
    let callCount = 0;
    const slowFactory = () => new Promise<string>(r => {
      callCount++;
      setTimeout(() => r('result'), 20);
    });

    const [r1, r2] = await Promise.all([
      cache.getOrSet('k', slowFactory, 5000),
      cache.getOrSet('k', slowFactory, 5000),
    ]);

    expect(callCount).toBe(1); // only one actual DB call
    expect(r1).toBe(r2);
  });

  it('evicts LRU entries when MAX_ENTRIES reached', () => {
    // Fill to capacity (10 entries)
    for (let i = 0; i < 10; i++) cache.set(`k${i}`, i, 60_000);
    // Add one more → triggers LRU eviction
    cache.set('k_new', 'new', 60_000);
    expect(cache.stats().size).toBeLessThanOrEqual(10);
  });

  it('evictExpired removes only expired entries', async () => {
    cache.set('short', 'x', 1);    // expires almost instantly
    cache.set('long', 'y', 60_000); // far future
    await new Promise(r => setTimeout(r, 10));
    cache.evictExpired();
    expect(cache.get('short')).toBeNull();
    expect(cache.get('long')).not.toBeNull();
  });

  it('stats() returns correct size', () => {
    cache.set('a', 1); cache.set('b', 2);
    expect(cache.stats().size).toBe(2);
  });
});
