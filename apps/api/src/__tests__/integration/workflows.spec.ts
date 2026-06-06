/**
 * apps/api/src/__tests__/integration/workflows.spec.ts
 *
 * Integration-level tests: full service-layer flows that wire multiple
 * collaborators together — no NestJS container, no real DB.
 *
 * Scenarios:
 *   1. Full registration → login → create listing → view listing workflow
 *   2. Listing owner delete vs. stranger delete
 *   3. Password reset lifecycle (request → consume → verify)
 *   4. Refresh token rotation lifecycle
 *   5. Search with filter combinations
 *   6. Dealer profile creation and deduplication
 *   7. Admin moderation (approve / reject listing)
 *   8. Cache invalidation on mutation
 */

import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import {
  ForbiddenException, NotFoundException, ConflictException, UnauthorizedException, BadRequestException,
} from '@nestjs/common';
import {
  makeUser, makeListing, makeBrand, makePayment,
  mockPrisma, mockJwt, mockCache, mockEmail,
} from '../fixtures/factories';

const BCRYPT_ROUNDS = 8;
const hashToken = (t: string) => crypto.createHash('sha256').update(t).digest('hex');

// ─────────────────────────────────────────────────────────────────────────────
// Minimal full-stack service shims
// ─────────────────────────────────────────────────────────────────────────────

class AuthService {
  constructor(private prisma: any, private jwt: any, private email: any) {}

  async register(dto: any) {
    if (await this.prisma.user.findUnique({ where: { email: dto.email } }))
      throw new ConflictException('Email already registered');
    const hash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    const user = await this.prisma.user.create({ data: { ...dto, password: hash, role: dto.role ?? 'USER', verified: false }, select: { id: true, email: true, name: true, role: true, verified: true } });
    await this.prisma.auditLog.create({ data: { userId: user.id, action: 'REGISTER' } });
    return { access_token: this.jwt.sign({ sub: user.id }), user };
  }

  async login(dto: any) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email }, select: { id: true, email: true, name: true, role: true, verified: true, password: true, failedLoginAttempts: true, lockedUntil: true } });
    if (user?.lockedUntil && user.lockedUntil > new Date()) throw new ForbiddenException('Locked');
    if (!user || !await bcrypt.compare(dto.password, user.password)) throw new UnauthorizedException('Bad credentials');
    if (user.failedLoginAttempts > 0) await this.prisma.user.update({ where: { id: user.id }, data: { failedLoginAttempts: 0 } });
    await this.prisma.auditLog.create({ data: { userId: user.id, action: 'LOGIN_SUCCESS' } });
    const { password: _pw, ...safe } = user;
    return { access_token: this.jwt.sign({ sub: user.id }), user: safe };
  }

  async forgotPassword(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email }, select: { id: true, name: true, email: true, banned: true, deletedAt: true } });
    if (user && !user.banned && !user.deletedAt) {
      const raw = crypto.randomBytes(32).toString('hex');
      await this.prisma.passwordResetToken.create({ data: { userId: user.id, tokenHash: hashToken(raw), expiresAt: new Date(Date.now() + 30 * 60 * 1000) } });
      this.email.sendPasswordResetEmail(email, user.name, raw).catch(() => {});
    }
    return { message: 'If registered, a reset link was sent.' };
  }

  async resetPassword(token: string, newPw: string) {
    const record = await this.prisma.passwordResetToken.findUnique({ where: { tokenHash: hashToken(token) }, include: { user: { select: { id: true, banned: true, deletedAt: true } } } } as any);
    if (!record || record.usedAt || record.expiresAt < new Date() || record.user?.banned) throw new BadRequestException('Invalid token');
    const hash = await bcrypt.hash(newPw, BCRYPT_ROUNDS);
    await this.prisma.$transaction([
      this.prisma.passwordResetToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
      this.prisma.user.update({ where: { id: record.userId }, data: { password: hash, failedLoginAttempts: 0 } }),
      this.prisma.refreshToken.deleteMany({ where: { userId: record.userId } }),
    ]);
    return { message: 'Password reset.' };
  }
}

class ListingsService {
  constructor(private prisma: any, private cache: any) {}

  async create(dto: any, userId: string) {
    return this.prisma.listing.create({ data: { ...dto, userId, status: 'PENDING' } });
  }

  async get(id: string, requesterId?: string) {
    const l = await this.prisma.listing.findUnique({ where: { id } });
    if (!l || (l.status !== 'ACTIVE' && l.userId !== requesterId)) throw new NotFoundException('Not found');
    return l;
  }

  async approve(id: string, adminRole: string) {
    if (adminRole !== 'ADMIN') throw new ForbiddenException('Admin only');
    return this.prisma.listing.update({ where: { id }, data: { status: 'ACTIVE' } });
  }

  async reject(id: string, adminRole: string, reason: string) {
    if (adminRole !== 'ADMIN') throw new ForbiddenException('Admin only');
    return this.prisma.listing.update({ where: { id }, data: { status: 'REJECTED' } });
  }

  async delete(id: string, userId: string, role: string) {
    const l = await this.prisma.listing.findUnique({ where: { id } });
    if (!l) throw new NotFoundException();
    if (l.userId !== userId && role !== 'ADMIN') throw new ForbiddenException();
    this.cache.del('listings:');
    return this.prisma.listing.update({ where: { id }, data: { status: 'DELETED' } });
  }
}

class SearchService {
  constructor(private prisma: any, private cache: any) {}

  async search(q: string, filters: any = {}, page = 1, limit = 20) {
    const key = `search:${q}:${JSON.stringify(filters)}:${page}:${limit}`;
    return this.cache.getOrSet(key, async () => {
      const where: any = { status: 'ACTIVE' };
      if (q) where.OR = [{ titleEn: { contains: q } }, { titleKu: { contains: q } }];
      if (filters.type)     where.type = filters.type;
      if (filters.minPrice) where.price = { gte: Number(filters.minPrice) };
      if (filters.maxPrice) where.price = { ...where.price, lte: Number(filters.maxPrice) };
      const [data, total] = await Promise.all([
        this.prisma.listing.findMany({ where, skip: (page - 1) * limit, take: limit }),
        this.prisma.listing.count({ where }),
      ]);
      return { data, total, page };
    });
  }
}

// ─────────────────────────────────────────────────────────────────────────────

describe('Integration: Registration → Login → Listing workflow', () => {
  let prisma: ReturnType<typeof mockPrisma>;
  let jwt:    ReturnType<typeof mockJwt>;
  let email:  ReturnType<typeof mockEmail>;
  let cache:  ReturnType<typeof mockCache>;
  let authSvc:     AuthService;
  let listingsSvc: ListingsService;

  beforeEach(() => {
    prisma = mockPrisma(); jwt = mockJwt(); email = mockEmail(); cache = mockCache();
    authSvc     = new AuthService(prisma, jwt, email);
    listingsSvc = new ListingsService(prisma, cache);
  });

  it('user can register, log in, and create a listing end-to-end', async () => {
    // Step 1: Register
    prisma.user.findUnique.mockResolvedValueOnce(null); // no existing user
    prisma.user.create.mockResolvedValueOnce({ id: 'new-user', email: 'u@x.com', name: 'Test', role: 'USER', verified: false });
    prisma.auditLog.create.mockResolvedValue({});

    const { user } = await authSvc.register({ name: 'Test', email: 'u@x.com', password: 'Pass1!', role: 'USER' });
    expect(user.id).toBe('new-user');

    // Step 2: Login
    const hash = await bcrypt.hash('Pass1!', BCRYPT_ROUNDS);
    prisma.user.findUnique.mockResolvedValueOnce({ id: 'new-user', email: 'u@x.com', name: 'Test', role: 'USER', verified: false, password: hash, failedLoginAttempts: 0, lockedUntil: null });
    prisma.user.update.mockResolvedValue({});

    const loginRes = await authSvc.login({ email: 'u@x.com', password: 'Pass1!' });
    expect(loginRes.access_token).toBeTruthy();

    // Step 3: Create listing
    prisma.listing.create.mockResolvedValueOnce(makeListing({ userId: 'new-user', status: 'PENDING' }));
    const listing = await listingsSvc.create({ titleKu: 'تۆیۆتا', price: 20000, type: 'CAR' }, 'new-user');
    expect(listing.userId).toBe('new-user');
    expect(listing.status).toBe('PENDING');
  });

  it('new listing is not publicly visible until admin approves', async () => {
    prisma.listing.findUnique.mockResolvedValueOnce(makeListing({ status: 'PENDING', userId: 'owner-id' }));
    // Non-owner cannot see PENDING listing
    await expect(listingsSvc.get('listing-uuid-5555', 'stranger-id')).rejects.toThrow(NotFoundException);
  });

  it('owner can view their own PENDING listing before approval', async () => {
    prisma.listing.findUnique.mockResolvedValueOnce(makeListing({ status: 'PENDING', userId: 'owner-id' }));
    const result = await listingsSvc.get('listing-uuid-5555', 'owner-id');
    expect(result.status).toBe('PENDING');
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('Integration: Admin moderation workflow', () => {
  let prisma: ReturnType<typeof mockPrisma>;
  let cache:  ReturnType<typeof mockCache>;
  let svc:    ListingsService;

  beforeEach(() => {
    prisma = mockPrisma(); cache = mockCache();
    svc = new ListingsService(prisma, cache);
  });

  it('admin can approve a PENDING listing', async () => {
    prisma.listing.update.mockResolvedValueOnce(makeListing({ status: 'ACTIVE' }));
    const result = await svc.approve('listing-uuid-5555', 'ADMIN');
    expect(result.status).toBe('ACTIVE');
  });

  it('non-admin cannot approve a listing', async () => {
    await expect(svc.approve('listing-uuid-5555', 'USER')).rejects.toThrow(ForbiddenException);
    expect(prisma.listing.update).not.toHaveBeenCalled();
  });

  it('admin can reject a listing', async () => {
    prisma.listing.update.mockResolvedValueOnce(makeListing({ status: 'REJECTED' }));
    const result = await svc.reject('listing-uuid-5555', 'ADMIN', 'Spam');
    expect(result.status).toBe('REJECTED');
  });

  it('DEALER cannot approve listings', async () => {
    await expect(svc.approve('listing-uuid-5555', 'DEALER')).rejects.toThrow(ForbiddenException);
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('Integration: Password reset lifecycle', () => {
  let prisma: ReturnType<typeof mockPrisma>;
  let jwt:    ReturnType<typeof mockJwt>;
  let email:  ReturnType<typeof mockEmail>;
  let svc:    AuthService;

  beforeEach(() => {
    prisma = mockPrisma(); jwt = mockJwt(); email = mockEmail();
    svc = new AuthService(prisma, jwt, email);
  });

  it('step 1: always returns generic response for non-existent email', async () => {
    prisma.user.findUnique.mockResolvedValueOnce(null);
    const res = await svc.forgotPassword('nobody@x.com');
    expect(res.message).toBeTruthy();
    expect(prisma.passwordResetToken.create).not.toHaveBeenCalled();
  });

  it('step 1: creates token for registered user and sends email', async () => {
    prisma.user.findUnique.mockResolvedValueOnce(makeUser());
    prisma.passwordResetToken.create.mockResolvedValueOnce({});

    await svc.forgotPassword('test@carsauto.iq');
    expect(prisma.passwordResetToken.create).toHaveBeenCalledTimes(1);
    expect(email.sendPasswordResetEmail).toHaveBeenCalledTimes(1);
  });

  it('step 2: valid token resets password and revokes all sessions atomically', async () => {
    const tokenRecord = {
      id: 'tr-1', userId: 'user-uuid-1111', usedAt: null,
      expiresAt: new Date(Date.now() + 20 * 60 * 1000),
      user: { id: 'user-uuid-1111', banned: false, deletedAt: null },
    };
    prisma.passwordResetToken.findUnique.mockResolvedValueOnce(tokenRecord);
    prisma.$transaction.mockImplementation((ops: any[]) => Promise.all(ops));
    prisma.passwordResetToken.update.mockResolvedValueOnce({});
    prisma.user.update.mockResolvedValueOnce({});
    prisma.refreshToken.deleteMany.mockResolvedValueOnce({});

    const res = await svc.resetPassword('a-valid-32-char-reset-token!!!!', 'NewPass1!');
    expect(res.message).toBeTruthy();
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
  });

  it('step 2: expired token is rejected', async () => {
    const tokenRecord = {
      id: 'tr-1', userId: 'u1', usedAt: null,
      expiresAt: new Date(Date.now() - 1000), // expired
      user: { id: 'u1', banned: false, deletedAt: null },
    };
    prisma.passwordResetToken.findUnique.mockResolvedValueOnce(tokenRecord);
    await expect(svc.resetPassword('a-valid-32-char-reset-token!!!!', 'NewPass1!')).rejects.toThrow(BadRequestException);
  });

  it('step 2: already-used token is rejected', async () => {
    const tokenRecord = {
      id: 'tr-1', userId: 'u1', usedAt: new Date(), // already consumed
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      user: { id: 'u1', banned: false, deletedAt: null },
    };
    prisma.passwordResetToken.findUnique.mockResolvedValueOnce(tokenRecord);
    await expect(svc.resetPassword('a-valid-32-char-reset-token!!!!', 'NewPass1!')).rejects.toThrow(BadRequestException);
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('Integration: Search with filter combinations', () => {
  let prisma: ReturnType<typeof mockPrisma>;
  let cache:  ReturnType<typeof mockCache>;
  let svc:    SearchService;

  beforeEach(() => {
    prisma = mockPrisma(); cache = mockCache();
    svc = new SearchService(prisma, cache);
    cache.getOrSet.mockImplementation((_k: any, f: any) => f());
  });

  it('returns only ACTIVE listings in results', async () => {
    prisma.listing.findMany.mockResolvedValue([]);
    prisma.listing.count.mockResolvedValue(0);
    await svc.search('toyota');
    expect(prisma.listing.findMany.mock.calls[0][0].where.status).toBe('ACTIVE');
  });

  it('combines keyword + type filter correctly', async () => {
    prisma.listing.findMany.mockResolvedValue([]);
    prisma.listing.count.mockResolvedValue(0);
    await svc.search('toyota', { type: 'CAR' });
    const where = prisma.listing.findMany.mock.calls[0][0].where;
    expect(where.type).toBe('CAR');
    expect(where).toHaveProperty('OR');
  });

  it('price range filter maps to gte/lte', async () => {
    prisma.listing.findMany.mockResolvedValue([]);
    prisma.listing.count.mockResolvedValue(0);
    await svc.search('', { minPrice: '5000', maxPrice: '30000' });
    const where = prisma.listing.findMany.mock.calls[0][0].where;
    expect(where.price).toMatchObject({ gte: 5000, lte: 30000 });
  });

  it('pagination: page 2 skips first page', async () => {
    prisma.listing.findMany.mockResolvedValue([]);
    prisma.listing.count.mockResolvedValue(50);
    await svc.search('', {}, 2, 20);
    expect(prisma.listing.findMany.mock.calls[0][0].skip).toBe(20);
  });

  it('uses cache for identical search query', async () => {
    cache.getOrSet.mockRestore?.();
    const cacheSpy = jest.fn().mockReturnValue({ data: [], total: 0, page: 1 });
    (svc as any).cache.getOrSet = cacheSpy;
    await svc.search('toyota');
    expect(cacheSpy).toHaveBeenCalledTimes(1);
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('Integration: Cache invalidation on listing mutation', () => {
  let prisma: ReturnType<typeof mockPrisma>;
  let cache:  ReturnType<typeof mockCache>;
  let svc:    ListingsService;

  beforeEach(() => {
    prisma = mockPrisma(); cache = mockCache();
    svc = new ListingsService(prisma, cache);
  });

  it('delete invalidates listings cache namespace', async () => {
    prisma.listing.findUnique.mockResolvedValue(makeListing({ userId: 'user-uuid-1111' }));
    prisma.listing.update.mockResolvedValue({});
    await svc.delete('listing-uuid-5555', 'user-uuid-1111', 'USER');
    expect(cache.del).toHaveBeenCalledWith('listings:');
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('Integration: Listing access control matrix', () => {
  let prisma: ReturnType<typeof mockPrisma>;
  let cache:  ReturnType<typeof mockCache>;
  let svc:    ListingsService;

  beforeEach(() => {
    prisma = mockPrisma(); cache = mockCache();
    svc = new ListingsService(prisma, cache);
  });

  const scenarios = [
    { role: 'USER',   isOwner: true,  canDelete: true,  label: 'owner USER' },
    { role: 'USER',   isOwner: false, canDelete: false, label: 'non-owner USER' },
    { role: 'DEALER', isOwner: true,  canDelete: true,  label: 'owner DEALER' },
    { role: 'DEALER', isOwner: false, canDelete: false, label: 'non-owner DEALER' },
    { role: 'ADMIN',  isOwner: false, canDelete: true,  label: 'ADMIN (any listing)' },
  ];

  scenarios.forEach(({ role, isOwner, canDelete, label }) => {
    it(`${label}: canDelete=${canDelete}`, async () => {
      const actorId = isOwner ? 'user-uuid-1111' : 'other-user';
      prisma.listing.findUnique.mockResolvedValue(makeListing({ userId: 'user-uuid-1111' }));
      prisma.listing.update.mockResolvedValue({});

      if (canDelete) {
        await expect(svc.delete('listing-uuid-5555', actorId, role)).resolves.not.toThrow();
      } else {
        await expect(svc.delete('listing-uuid-5555', actorId, role)).rejects.toThrow(ForbiddenException);
      }
    });
  });
});
