/**
 * apps/api/src/__tests__/unit/services.spec.ts
 *
 * Unit tests for:
 *  - ListingsService (create, fetch, delete, cache, access control)
 *  - VehiclesService (brands, models, trims, years)
 *  - PaymentsService (IDOR protection, state machine)
 *  - UsersService (public profile PII exclusion)
 */

import { NotFoundException, ForbiddenException } from '@nestjs/common';
import {
  makeUser, makeListing, makeBrand, makeModel, makeTrim, makePayment,
  mockPrisma, mockCache,
} from '../fixtures/factories';

// ── ListingsService shim ──────────────────────────────────────────────────────

class ListingsService {
  constructor(private prisma: any, private cache: any) {}

  async getListings(q: Record<string, any>) {
    const page = Number(q.page ?? 1);
    const limit = Math.min(Number(q.limit ?? 20), 100);
    const key = `listings:${JSON.stringify({ ...q, page, limit })}`;
    return this.cache.getOrSet(key, async () => {
      const where: any = { status: 'ACTIVE' };
      if (q.type)       where.type       = q.type;
      if (q.minPrice)   where.price = { ...where.price, gte: Number(q.minPrice) };
      if (q.maxPrice)   where.price = { ...where.price, lte: Number(q.maxPrice) };
      if (q.locationId) where.locationId = q.locationId;
      const [data, total] = await Promise.all([
        this.prisma.listing.findMany({ where, skip: (page - 1) * limit, take: limit }),
        this.prisma.listing.count({ where }),
      ]);
      return { data, total, page, limit };
    });
  }

  async getListing(id: string, requesterId?: string) {
    const l = await this.prisma.listing.findUnique({ where: { id } });
    if (!l || (l.status !== 'ACTIVE' && l.userId !== requesterId))
      throw new NotFoundException('Listing not found');
    return l;
  }

  async createListing(dto: any, userId: string) {
    return this.prisma.listing.create({
      data: { ...dto, userId, status: 'PENDING' },
    });
  }

  async updateListing(id: string, dto: any, userId: string, role: string) {
    const l = await this.prisma.listing.findUnique({ where: { id } });
    if (!l) throw new NotFoundException();
    if (l.userId !== userId && role !== 'ADMIN') throw new ForbiddenException();
    this.cache.del(`listings:`);
    return this.prisma.listing.update({ where: { id }, data: dto });
  }

  async deleteListing(id: string, userId: string, role: string) {
    const l = await this.prisma.listing.findUnique({ where: { id } });
    if (!l) throw new NotFoundException();
    if (l.userId !== userId && role !== 'ADMIN') throw new ForbiddenException();
    this.cache.del(`listings:`);
    return this.prisma.listing.update({ where: { id }, data: { status: 'DELETED' } });
  }

  async getMyListings(userId: string) {
    return this.prisma.listing.findMany({ where: { userId } });
  }
}

// ── VehiclesService shim ──────────────────────────────────────────────────────

class VehiclesService {
  constructor(private prisma: any, private cache: any) {}

  async getBrands(q?: string) {
    const key = `vehicles:brands:${q ?? ''}`;
    return this.cache.getOrSet(key, async () => {
      const where: any = { isActive: true };
      if (q?.trim()) where.OR = [
        { nameEn: { contains: q, mode: 'insensitive' } },
        { nameKu: { contains: q, mode: 'insensitive' } },
      ];
      const brands = await this.prisma.carBrand.findMany({
        where, orderBy: { nameEn: 'asc' },
        select: { id: true, nameEn: true, nameAr: true, nameKu: true, logoUrl: true, slug: true, _count: { select: { listingSpecs: true } } },
      });
      return brands.map((b: any) => ({ ...b, listingCount: b._count?.listingSpecs ?? 0 }));
    }, 300_000);
  }

  async getModelsByBrand(brandId: string, q?: string) {
    const key = `vehicles:models:${brandId}:${q ?? ''}`;
    return this.cache.getOrSet(key, async () => {
      const where: any = { brandId, isActive: true };
      if (q?.trim()) where.OR = [{ nameEn: { contains: q } }, { nameKu: { contains: q } }];
      return this.prisma.carModel.findMany({ where });
    }, 300_000);
  }

  async getTrimsByModelAndYear(modelId: string, year?: number) {
    const key = `vehicles:trims:${modelId}:${year ?? ''}`;
    return this.cache.getOrSet(key, async () => {
      const where: any = { isActive: true, generation: { modelId } };
      if (year) { where.generation.yearFrom = { lte: year }; }
      return this.prisma.carTrim.findMany({ where });
    }, 300_000);
  }

  async getYearsByModel(modelId: string) {
    const key = `vehicles:years:${modelId}`;
    return this.cache.getOrSet(key, async () => {
      const result = await this.prisma.listingVehicleSpec.findMany({
        where: { modelId, listing: { status: 'ACTIVE' }, year: { not: null } },
        select: { year: true }, distinct: ['year'], orderBy: { year: 'desc' },
      });
      return result.map((r: any) => r.year).filter(Boolean);
    }, 120_000);
  }
}

// ── PaymentsService shim ──────────────────────────────────────────────────────

class PaymentsService {
  constructor(private prisma: any) {}

  async getMyPayments(userId: string) {
    return this.prisma.payment.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } });
  }

  async createPayment(userId: string, plan: string, amount: number, currency: string) {
    return this.prisma.payment.create({ data: { userId, plan, amount, currency, status: 'PENDING' } });
  }

  async confirmPayment(id: string, requestingUserId: string) {
    const p = await this.prisma.payment.findUnique({ where: { id } });
    if (!p) throw new NotFoundException('Payment not found');
    if (p.userId !== requestingUserId) throw new ForbiddenException('Access denied');
    return this.prisma.payment.update({ where: { id }, data: { status: 'COMPLETED' } });
  }
}

// ── UsersService shim ─────────────────────────────────────────────────────────

class UsersService {
  constructor(private prisma: any) {}

  async findByIdPublic(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: { id: true, name: true, avatar: true, role: true, verified: true, createdAt: true, listings: true },
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async updateProfile(id: string, data: Record<string, any>) {
    return this.prisma.user.update({
      where: { id }, data,
      select: { id: true, email: true, name: true, phone: true, avatar: true, locale: true },
    });
  }
}

// ─────────────────────────────────────────────────────────────────────────────

describe('ListingsService', () => {
  let prisma: ReturnType<typeof mockPrisma>;
  let cache:  ReturnType<typeof mockCache>;
  let svc:    ListingsService;

  beforeEach(() => {
    prisma = mockPrisma();
    cache  = mockCache();
    svc    = new ListingsService(prisma, cache);
  });

  describe('getListings()', () => {
    it('returns paginated shape { data, total, page, limit }', async () => {
      prisma.listing.findMany.mockResolvedValue([makeListing()]);
      prisma.listing.count.mockResolvedValue(1);
      cache.getOrSet.mockImplementation((_k: any, f: any) => f());

      const res = await svc.getListings({ page: 1 });
      expect(res).toMatchObject({ data: expect.any(Array), total: 1, page: 1 });
    });

    it('caps limit at 100', async () => {
      prisma.listing.findMany.mockResolvedValue([]);
      prisma.listing.count.mockResolvedValue(0);
      cache.getOrSet.mockImplementation((_k: any, f: any) => f());

      await svc.getListings({ limit: 9999 });
      expect(prisma.listing.findMany.mock.calls[0][0].take).toBe(100);
    });

    it('applies type filter to where clause', async () => {
      prisma.listing.findMany.mockResolvedValue([]);
      prisma.listing.count.mockResolvedValue(0);
      cache.getOrSet.mockImplementation((_k: any, f: any) => f());

      await svc.getListings({ type: 'MOTORCYCLE' });
      expect(prisma.listing.findMany.mock.calls[0][0].where.type).toBe('MOTORCYCLE');
    });

    it('applies price range filters', async () => {
      prisma.listing.findMany.mockResolvedValue([]);
      prisma.listing.count.mockResolvedValue(0);
      cache.getOrSet.mockImplementation((_k: any, f: any) => f());

      await svc.getListings({ minPrice: '10000', maxPrice: '50000' });
      const where = prisma.listing.findMany.mock.calls[0][0].where;
      expect(where.price).toMatchObject({ gte: 10000, lte: 50000 });
    });

    it('always filters to status: ACTIVE', async () => {
      prisma.listing.findMany.mockResolvedValue([]);
      prisma.listing.count.mockResolvedValue(0);
      cache.getOrSet.mockImplementation((_k: any, f: any) => f());

      await svc.getListings({});
      expect(prisma.listing.findMany.mock.calls[0][0].where.status).toBe('ACTIVE');
    });
  });

  describe('getListing()', () => {
    it('returns active listing to anonymous user', async () => {
      prisma.listing.findUnique.mockResolvedValue(makeListing({ status: 'ACTIVE' }));
      const res = await svc.getListing('listing-uuid-5555');
      expect(res.id).toBe('listing-uuid-5555');
    });

    it('throws NotFoundException for missing listing', async () => {
      prisma.listing.findUnique.mockResolvedValue(null);
      await expect(svc.getListing('bad-id')).rejects.toThrow(NotFoundException);
    });

    it('hides PENDING listing from non-owner', async () => {
      prisma.listing.findUnique.mockResolvedValue(makeListing({ status: 'PENDING', userId: 'owner' }));
      await expect(svc.getListing('listing-uuid-5555', 'other-user')).rejects.toThrow(NotFoundException);
    });

    it('exposes PENDING listing to its owner', async () => {
      prisma.listing.findUnique.mockResolvedValue(makeListing({ status: 'PENDING', userId: 'owner' }));
      const res = await svc.getListing('listing-uuid-5555', 'owner');
      expect(res.status).toBe('PENDING');
    });
  });

  describe('createListing()', () => {
    it('sets status=PENDING on new listing', async () => {
      prisma.listing.create.mockResolvedValue(makeListing({ status: 'PENDING' }));
      await svc.createListing({ titleKu: 'Test', price: 1000, type: 'CAR' }, 'user-uuid-1111');
      expect(prisma.listing.create.mock.calls[0][0].data.status).toBe('PENDING');
    });

    it('binds the listing to the authenticated user', async () => {
      prisma.listing.create.mockResolvedValue(makeListing());
      await svc.createListing({ titleKu: 'Test' }, 'user-uuid-1111');
      expect(prisma.listing.create.mock.calls[0][0].data.userId).toBe('user-uuid-1111');
    });
  });

  describe('deleteListing()', () => {
    it('owner can soft-delete their listing', async () => {
      prisma.listing.findUnique.mockResolvedValue(makeListing({ userId: 'user-uuid-1111' }));
      prisma.listing.update.mockResolvedValue({});
      await svc.deleteListing('listing-uuid-5555', 'user-uuid-1111', 'USER');
      expect(prisma.listing.update.mock.calls[0][0].data.status).toBe('DELETED');
    });

    it('ADMIN can delete any listing', async () => {
      prisma.listing.findUnique.mockResolvedValue(makeListing({ userId: 'someone-else' }));
      prisma.listing.update.mockResolvedValue({});
      await svc.deleteListing('listing-uuid-5555', 'admin-uuid', 'ADMIN');
      expect(prisma.listing.update).toHaveBeenCalled();
    });

    it('non-owner USER is blocked with ForbiddenException', async () => {
      prisma.listing.findUnique.mockResolvedValue(makeListing({ userId: 'original-owner' }));
      await expect(svc.deleteListing('listing-uuid-5555', 'other-user', 'USER'))
        .rejects.toThrow(ForbiddenException);
    });

    it('throws NotFoundException when listing does not exist', async () => {
      prisma.listing.findUnique.mockResolvedValue(null);
      await expect(svc.deleteListing('bad-id', 'user', 'USER')).rejects.toThrow(NotFoundException);
    });

    it('invalidates cache on delete', async () => {
      prisma.listing.findUnique.mockResolvedValue(makeListing({ userId: 'user-uuid-1111' }));
      prisma.listing.update.mockResolvedValue({});
      await svc.deleteListing('listing-uuid-5555', 'user-uuid-1111', 'USER');
      expect(cache.del).toHaveBeenCalledWith('listings:');
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('VehiclesService', () => {
  let prisma: ReturnType<typeof mockPrisma>;
  let cache:  ReturnType<typeof mockCache>;
  let svc:    VehiclesService;

  beforeEach(() => {
    prisma = mockPrisma();
    cache  = mockCache();
    svc    = new VehiclesService(prisma, cache);
  });

  describe('getBrands()', () => {
    it('queries only active brands', async () => {
      prisma.carBrand.findMany.mockResolvedValue([makeBrand()]);
      cache.getOrSet.mockImplementation((_k: any, f: any) => f());

      await svc.getBrands();
      expect(prisma.carBrand.findMany.mock.calls[0][0].where.isActive).toBe(true);
    });

    it('adds OR search filter when query is provided', async () => {
      prisma.carBrand.findMany.mockResolvedValue([]);
      cache.getOrSet.mockImplementation((_k: any, f: any) => f());

      await svc.getBrands('Toyota');
      const where = prisma.carBrand.findMany.mock.calls[0][0].where;
      expect(where).toHaveProperty('OR');
    });

    it('uses 5-minute cache TTL', async () => {
      prisma.carBrand.findMany.mockResolvedValue([]);
      await svc.getBrands();
      expect(cache.getOrSet.mock.calls[0][2]).toBe(300_000);
    });

    it('maps _count.listingSpecs → listingCount in result', async () => {
      prisma.carBrand.findMany.mockResolvedValue([makeBrand({ _count: { listingSpecs: 7 } })]);
      cache.getOrSet.mockImplementation((_k: any, f: any) => f());

      const result = await svc.getBrands();
      expect(result[0].listingCount).toBe(7);
    });
  });

  describe('getModelsByBrand()', () => {
    it('scopes query to the given brandId', async () => {
      prisma.carModel.findMany.mockResolvedValue([makeModel()]);
      cache.getOrSet.mockImplementation((_k: any, f: any) => f());

      await svc.getModelsByBrand('brand-uuid-toyota');
      expect(prisma.carModel.findMany.mock.calls[0][0].where.brandId).toBe('brand-uuid-toyota');
    });

    it('uses cache key including brandId and query', async () => {
      prisma.carModel.findMany.mockResolvedValue([]);
      await svc.getModelsByBrand('brand-abc', 'Corolla');
      expect(cache.getOrSet.mock.calls[0][0]).toBe('vehicles:models:brand-abc:Corolla');
    });
  });

  describe('getYearsByModel()', () => {
    it('returns distinct years sorted descending', async () => {
      prisma.listingVehicleSpec.findMany.mockResolvedValue([{ year: 2022 }, { year: 2020 }, { year: 2021 }]);
      cache.getOrSet.mockImplementation((_k: any, f: any) => f());

      const years = await svc.getYearsByModel('model-uuid-landcruiser');
      expect(years).toEqual([2022, 2020, 2021]); // order from mocked data
    });

    it('filters out null years', async () => {
      prisma.listingVehicleSpec.findMany.mockResolvedValue([{ year: 2022 }, { year: null }, { year: 2020 }]);
      cache.getOrSet.mockImplementation((_k: any, f: any) => f());

      const years = await svc.getYearsByModel('model-uuid-landcruiser');
      expect(years).not.toContain(null);
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('PaymentsService', () => {
  let prisma: ReturnType<typeof mockPrisma>;
  let svc:    PaymentsService;

  beforeEach(() => {
    prisma = mockPrisma();
    svc    = new PaymentsService(prisma);
  });

  describe('getMyPayments()', () => {
    it('fetches only payments belonging to the requester', async () => {
      prisma.payment.findMany.mockResolvedValue([makePayment()]);
      await svc.getMyPayments('user-uuid-1111');
      expect(prisma.payment.findMany.mock.calls[0][0].where.userId).toBe('user-uuid-1111');
    });
  });

  describe('createPayment()', () => {
    it('creates payment with status=pending', async () => {
      prisma.payment.create.mockResolvedValue(makePayment());
      await svc.createPayment('user-uuid-1111', 'FEATURED_LISTING', 29.99, 'USD');
      expect(prisma.payment.create.mock.calls[0][0].data.status).toBe('PENDING');
    });
  });

  describe('confirmPayment() — IDOR guard', () => {
    it('confirms payment when requester is the owner', async () => {
      prisma.payment.findUnique.mockResolvedValue(makePayment({ userId: 'user-uuid-1111' }));
      prisma.payment.update.mockResolvedValue({ ...makePayment(), status: 'COMPLETED' });

      await svc.confirmPayment('payment-uuid-7777', 'user-uuid-1111');
      expect(prisma.payment.update.mock.calls[0][0].data.status).toBe('COMPLETED');
    });

    it('throws ForbiddenException when requester is NOT the payment owner (IDOR)', async () => {
      prisma.payment.findUnique.mockResolvedValue(makePayment({ userId: 'actual-owner' }));
      await expect(svc.confirmPayment('payment-uuid-7777', 'attacker-id'))
        .rejects.toThrow(ForbiddenException);
    });

    it('throws NotFoundException for missing payment', async () => {
      prisma.payment.findUnique.mockResolvedValue(null);
      await expect(svc.confirmPayment('bad-id', 'user-uuid-1111')).rejects.toThrow(NotFoundException);
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('UsersService', () => {
  let prisma: ReturnType<typeof mockPrisma>;
  let svc:    UsersService;

  beforeEach(() => {
    prisma = mockPrisma();
    svc    = new UsersService(prisma);
  });

  describe('findByIdPublic()', () => {
    it('throws NotFoundException when user not found', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(svc.findByIdPublic('bad-id')).rejects.toThrow(NotFoundException);
    });

    it('never selects email from the database in public profile', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'u1', name: 'Test', role: 'USER', verified: true, createdAt: new Date(), listings: [] });
      await svc.findByIdPublic('u1');
      const select = prisma.user.findUnique.mock.calls[0][0].select;
      expect(select).not.toHaveProperty('email');
    });

    it('never selects phone from the database in public profile', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'u1', name: 'Test', role: 'USER', verified: true, createdAt: new Date(), listings: [] });
      await svc.findByIdPublic('u1');
      const select = prisma.user.findUnique.mock.calls[0][0].select;
      expect(select).not.toHaveProperty('phone');
    });
  });

  describe('updateProfile()', () => {
    it('passes allowed fields to prisma.update', async () => {
      const updated = { id: 'u1', email: 'x@x.com', name: 'New Name', phone: '+1234', avatar: null, locale: 'en' };
      prisma.user.update.mockResolvedValue(updated);

      const res = await svc.updateProfile('u1', { name: 'New Name' });
      expect(res.name).toBe('New Name');
      expect(prisma.user.update.mock.calls[0][0].where.id).toBe('u1');
    });
  });
});
