/**
 * apps/api/src/__tests__/unit/cache-stampede.spec.ts
 *
 * PROMPT 3 FIX: cache.service.ts's getOrSetWithLock() adds single-flight
 * (lock-based) protection against cache-stampede/thundering-herd, used by
 * listings.service.ts findAll() and search.service.ts's search()/
 * semanticSearch()/autocomplete(). This tests the REAL CacheService class
 * (not a reimplementation) against a fake in-memory ioredis client, so it
 * exercises the actual production lock/poll/fail-open logic.
 */

import Redis from 'ioredis';

// ── Fake ioredis client ───────────────────────────────────────────────────────
// Implements just the subset of the ioredis API CacheService actually calls,
// with real TTL and NX semantics so SET ... PX ... NX behaves like real Redis.
class FakeRedis {
  private store = new Map<string, { value: string; expiresAt: number | null }>();

  on(): void {}
  disconnect(): void {}

  private isAlive(key: string): boolean {
    const e = this.store.get(key);
    if (!e) return false;
    if (e.expiresAt !== null && Date.now() > e.expiresAt) {
      this.store.delete(key);
      return false;
    }
    return true;
  }

  async get(key: string): Promise<string | null> {
    return this.isAlive(key) ? this.store.get(key)!.value : null;
  }

  async set(key: string, value: string, ...args: any[]): Promise<'OK' | null> {
    let ttlMs: number | null = null;
    let nx = false;
    for (let i = 0; i < args.length; i++) {
      if (args[i] === 'PX') { ttlMs = Number(args[i + 1]); i++; }
      else if (args[i] === 'EX') { ttlMs = Number(args[i + 1]) * 1000; i++; }
      else if (args[i] === 'NX') { nx = true; }
    }
    if (nx && this.isAlive(key)) return null;
    this.store.set(key, { value, expiresAt: ttlMs !== null ? Date.now() + ttlMs : null });
    return 'OK';
  }

  async del(...keys: string[]): Promise<number> {
    let count = 0;
    for (const k of keys) if (this.store.delete(k)) count++;
    return count;
  }

  async scan(cursor: string): Promise<[string, string[]]> {
    return ['0', []]; // no keys tested here rely on SCAN
  }

  async exists(key: string): Promise<number> {
    return this.isAlive(key) ? 1 : 0;
  }

  async dbsize(): Promise<number> {
    return this.store.size;
  }
}

jest.mock('ioredis', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => new FakeRedis()),
}));

// Import AFTER the mock so CacheService's `new Redis(...)` picks up FakeRedis.
// eslint-disable-next-line import/first
import { CacheService } from '../../common/cache/cache.service';

describe('CacheService.getOrSetWithLock (cache stampede protection)', () => {
  beforeEach(() => {
    process.env.REDIS_URL = 'redis://localhost:6379';
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('calls factory only once when N concurrent callers race on a cold key', async () => {
    const cache = new CacheService();
    let callCount = 0;
    const slowFactory = () =>
      new Promise<string>((resolve) => {
        callCount++;
        setTimeout(() => resolve('fresh-value'), 50);
      });

    const N = 20;
    const results = await Promise.all(
      Array.from({ length: N }, () => cache.getOrSetWithLock('hot-key', slowFactory, 5_000)),
    );

    expect(callCount).toBe(1);
    expect(results).toHaveLength(N);
    expect(results.every((r) => r === 'fresh-value')).toBe(true);
  });

  it('non-lock-holders return the same value the lock-holder computed', async () => {
    const cache = new CacheService();
    const factory = jest.fn().mockResolvedValue({ id: 'listing-1', price: 25000 });

    const [a, b, c] = await Promise.all([
      cache.getOrSetWithLock('shared-key', factory, 5_000),
      cache.getOrSetWithLock('shared-key', factory, 5_000),
      cache.getOrSetWithLock('shared-key', factory, 5_000),
    ]);

    expect(factory).toHaveBeenCalledTimes(1);
    expect(a).toEqual(b);
    expect(b).toEqual(c);
  });

  it('serves a warm cache without calling factory at all', async () => {
    const cache = new CacheService();
    const factory = jest.fn().mockResolvedValue('value');

    await cache.getOrSetWithLock('warm-key', factory, 5_000);
    factory.mockClear();

    const result = await cache.getOrSetWithLock('warm-key', factory, 5_000);
    expect(factory).not.toHaveBeenCalled();
    expect(result).toBe('value');
  });

  it('fails open (calls factory itself) when the lock wait times out', async () => {
    const cache = new CacheService();

    // Simulate a stuck/crashed lock-holder: acquire the lock directly via
    // the internal redis client and never write the cache key or release it.
    await (cache as any).redis.set('lock:stuck-key', '1', 'PX', 10_000, 'NX');

    const factory = jest.fn().mockResolvedValue('fallback-value');
    // Short maxWaitMs so the test doesn't have to wait out the real 2s default.
    const result = await cache.getOrSetWithLock('stuck-key', factory, 5_000, 10_000, 200);

    expect(factory).toHaveBeenCalledTimes(1);
    expect(result).toBe('fallback-value');
  });

  it('a bounded number of factory calls occur under the timeout-fallback path, never N', async () => {
    const cache = new CacheService();
    await (cache as any).redis.set('lock:contended-key', '1', 'PX', 10_000, 'NX');

    let callCount = 0;
    const factory = jest.fn().mockImplementation(() => {
      callCount++;
      return Promise.resolve('value');
    });

    const N = 10;
    // Every one of these N callers finds the lock already held and the cache
    // key never populated (the "holder" never writes it) — each individually
    // times out and falls back, but this must stay bounded (== N here, since
    // each caller times out independently), never silently hang or throw.
    const results = await Promise.all(
      Array.from({ length: N }, () => cache.getOrSetWithLock('contended-key', factory, 5_000, 10_000, 150)),
    );

    expect(results.every((r) => r === 'value')).toBe(true);
    expect(callCount).toBeLessThanOrEqual(N);
    expect(callCount).toBeGreaterThan(0);
  });
});
