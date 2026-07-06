/**
 * apps/api/src/__tests__/unit/prisma-replica-routing.spec.ts
 *
 * PROMPT 7 FIX: tests prisma.service.ts's multi-replica support —
 * resolveReplicaUrls()'s parsing precedence, and db('read')'s round-robin +
 * health-aware selection. No real database connection is made: PrismaClient
 * doesn't connect until $connect() is called, and this test never calls
 * onModuleInit(), so constructing PrismaService here is safe without a live
 * Postgres.
 */

process.env.DATABASE_URL = 'postgresql://user:pass@primary-host:5432/carsauto';

import { PrismaService, resolveReplicaUrls } from '../../common/prisma/prisma.service';

describe('resolveReplicaUrls (env var parsing precedence)', () => {
  const ORIGINAL_ENV = { ...process.env };

  afterEach(() => {
    process.env.DATABASE_READ_URLS = ORIGINAL_ENV.DATABASE_READ_URLS;
    process.env.DATABASE_READ_URL = ORIGINAL_ENV.DATABASE_READ_URL;
  });

  it('splits DATABASE_READ_URLS on comma, trims, and drops empties', () => {
    process.env.DATABASE_READ_URLS = ' postgresql://a , postgresql://b ,, postgresql://c ';
    delete process.env.DATABASE_READ_URL;
    expect(resolveReplicaUrls()).toEqual(['postgresql://a', 'postgresql://b', 'postgresql://c']);
  });

  it('de-duplicates identical URLs in DATABASE_READ_URLS', () => {
    process.env.DATABASE_READ_URLS = 'postgresql://a,postgresql://b,postgresql://a';
    expect(resolveReplicaUrls()).toEqual(['postgresql://a', 'postgresql://b']);
  });

  it('falls back to single DATABASE_READ_URL when DATABASE_READ_URLS is unset', () => {
    delete process.env.DATABASE_READ_URLS;
    process.env.DATABASE_READ_URL = 'postgresql://legacy-single-replica';
    expect(resolveReplicaUrls()).toEqual(['postgresql://legacy-single-replica']);
  });

  it('returns an empty array when neither is set (caller falls back to DATABASE_URL)', () => {
    delete process.env.DATABASE_READ_URLS;
    delete process.env.DATABASE_READ_URL;
    expect(resolveReplicaUrls()).toEqual([]);
  });

  it('DATABASE_READ_URLS takes precedence over DATABASE_READ_URL when both are set', () => {
    process.env.DATABASE_READ_URLS = 'postgresql://plural-a,postgresql://plural-b';
    process.env.DATABASE_READ_URL = 'postgresql://singular-should-be-ignored';
    expect(resolveReplicaUrls()).toEqual(['postgresql://plural-a', 'postgresql://plural-b']);
  });
});

describe('PrismaService.db("read") round-robin + health-aware selection', () => {
  const ORIGINAL_ENV = { ...process.env };

  afterEach(() => {
    process.env.DATABASE_READ_URLS = ORIGINAL_ENV.DATABASE_READ_URLS;
    process.env.DATABASE_READ_URL = ORIGINAL_ENV.DATABASE_READ_URL;
  });

  it('falls back to a single self-pointing replica when nothing is configured (today\'s no-replica behavior)', () => {
    delete process.env.DATABASE_READ_URLS;
    delete process.env.DATABASE_READ_URL;
    const prisma = new PrismaService();
    // Both reads should resolve to the (only) replica, distinct from the primary client itself.
    expect(prisma.db('read')).toBe(prisma.db('read'));
    expect(prisma.db('write')).toBe(prisma);
  });

  it('round-robins across multiple configured replicas in order', () => {
    process.env.DATABASE_READ_URLS = 'postgresql://replica-a,postgresql://replica-b,postgresql://replica-c';
    const prisma = new PrismaService();

    const seen = [prisma.db('read'), prisma.db('read'), prisma.db('read'), prisma.db('read')];
    // 3 replicas, 4 calls -> the 4th call should cycle back to the same
    // client as the 1st call.
    expect(seen[0]).toBe(seen[3]);
    // All of the first 3 should be distinct clients (one per replica).
    expect(new Set(seen.slice(0, 3)).size).toBe(3);
  });

  it('skips a replica marked unhealthy and continues round-robining the rest', () => {
    process.env.DATABASE_READ_URLS = 'postgresql://replica-a,postgresql://replica-b';
    const prisma = new PrismaService();

    // Mark the first configured replica unhealthy, as the reactive 'error'
    // listener / periodic recheck would in production.
    (prisma as any).replicas[0].healthy = false;

    const seen = [prisma.db('read'), prisma.db('read'), prisma.db('read')];
    // Every single call should land on the second (still-healthy) replica.
    const healthyReplicaClient = (prisma as any).replicas[1].client;
    expect(seen.every((client) => client === healthyReplicaClient)).toBe(true);
  });

  it('falls back to the primary when every configured replica is unhealthy', () => {
    process.env.DATABASE_READ_URLS = 'postgresql://replica-a,postgresql://replica-b';
    const prisma = new PrismaService();

    (prisma as any).replicas[0].healthy = false;
    (prisma as any).replicas[1].healthy = false;

    expect(prisma.db('read')).toBe(prisma);
  });

  it('write operations always stay pinned to the primary regardless of replica health', () => {
    process.env.DATABASE_READ_URLS = 'postgresql://replica-a';
    const prisma = new PrismaService();
    (prisma as any).replicas[0].healthy = false;

    expect(prisma.db('write')).toBe(prisma);
    expect(prisma.db()).toBe(prisma);
  });
});
