/**
 * apps/api/src/__tests__/unit/domain-services.spec.ts
 *
 * Unit tests for:
 *  - DealersService  (create, findAll filters, findBySlug, createReview, IDOR)
 *  - AiService       (suggestPrice, detectSpam, recommend scoring weights)
 *  - ChatService     (membership guard, self-chat prevention, getOrCreate)
 */

import {
  NotFoundException, ForbiddenException, ConflictException,
} from '@nestjs/common';
import { mockPrisma, mockCache, makeUser, makeListing } from '../fixtures/factories';

// ─────────────────────────────────────────────────────────────────────────────
// DealersService shim
// ─────────────────────────────────────────────────────────────────────────────

class DealersService {
  constructor(private prisma: any, private cache: any) {}

  async create(userId: string, dto: any) {
    const existing = await this.prisma.dealer.findUnique({ where: { userId } });
    if (existing) throw new ConflictException('Dealer profile already exists');
    const slug = dto.nameEn.toLowerCase().replace(/\s+/g, '-');
    const dealer = await this.prisma.dealer.create({
      data: { userId, slug, ...dto, subscription: { create: { plan: 'FREE', status: 'ACTIVE', maxListings: 5 } } },
    });
    this.cache.del('dealers:list:');
    return dealer;
  }

  async findAll(query: any) {
    const { city, tier, minRating, search, page = 1, limit = 20, sortBy = 'rating' } = query;
    const safeLimit = Math.min(Math.max(1, limit), 50);
    const key = `dealers:list:${JSON.stringify({ city, tier, minRating, search, page, safeLimit, sortBy })}`;
    return this.cache.getOrSet(key, async () => {
      const where: any = { status: 'VERIFIED' };
      if (tier)      where.tier = tier;
      if (minRating) where.averageRating = { gte: minRating };
      if (city)      where.location = { city: { contains: city, mode: 'insensitive' } };
      if (search)    where.OR = [
        { nameEn: { contains: search, mode: 'insensitive' } },
        { nameKu: { contains: search, mode: 'insensitive' } },
      ];
      const [dealers, total] = await Promise.all([
        this.prisma.dealer.findMany({ where, skip: (page - 1) * safeLimit, take: safeLimit }),
        this.prisma.dealer.count({ where }),
      ]);
      return { dealers, total, page, limit: safeLimit, pages: Math.ceil(total / safeLimit) };
    }, 30_000);
  }

  async findBySlug(slug: string) {
    const dealer = await this.cache.getOrSet(
      `dealers:detail:${slug}`,
      () => this.prisma.dealer.findUnique({ where: { slug } }),
      120_000,
    );
    if (!dealer || dealer.status !== 'VERIFIED') throw new NotFoundException('Dealer not found');
    return dealer;
  }

  async update(userId: string, dto: any) {
    const dealer = await this.prisma.dealer.findUnique({ where: { userId } });
    if (!dealer) throw new NotFoundException('Dealer profile not found');
    const updated = await this.prisma.dealer.update({ where: { id: dealer.id }, data: dto });
    this.cache.del(`dealers:detail:${dealer.slug}`);
    this.cache.del('dealers:list:');
    return updated;
  }

  async createReview(reviewerId: string, dealerSlug: string, dto: any) {
    const dealer = await this.prisma.dealer.findUnique({ where: { slug: dealerSlug }, select: { id: true, userId: true } });
    if (!dealer) throw new NotFoundException('Dealer not found');
    if (dealer.userId === reviewerId) throw new ForbiddenException('Cannot review your own dealership');
    return this.prisma.$transaction(async (tx: any) => {
      const review = await tx.dealerReview.create({ data: { dealerId: dealer.id, reviewerId, ...dto } });
      const agg = await tx.dealerReview.aggregate({ where: { dealerId: dealer.id }, _avg: { rating: true }, _count: { id: true } });
      await tx.dealer.update({ where: { id: dealer.id }, data: { averageRating: agg._avg.rating ?? 0, totalReviews: agg._count.id } });
      this.cache.del(`dealers:detail:${dealerSlug}`);
      return review;
    });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// AiService shim — isolates scoring logic
// ─────────────────────────────────────────────────────────────────────────────

const COUNTRY_BRAND_AFFINITY: Record<string, string[]> = {
  IQ: ['toyota', 'kia', 'hyundai', 'nissan', 'honda'],
  AE: ['bmw', 'mercedes-benz', 'toyota', 'nissan', 'range-rover'],
  DEFAULT: ['toyota', 'hyundai', 'kia', 'nissan', 'honda'],
};

const W = { BRAND_MATCH: 30, PRICE_PROXIMITY: 20, COUNTRY_POPULARITY: 8, SEARCH_KEYWORD: 15 };

class AiService {
  constructor(private prisma: any) {}

  async suggestPrice(make: string, model: string, year: number, mileage: number): Promise<number> {
    const comparable = await this.prisma.listing.findMany({
      where: { status: 'ACTIVE', vehicleSpec: { is: { year: { gte: year - 2, lte: year + 2 }, mileageKm: { lte: mileage + 30_000 } } } },
      select: { price: true }, take: 20,
    }).catch(() => []);

    if (comparable.length >= 3) {
      const prices = comparable.map((l: any) => l.price).sort((a: number, b: number) => a - b);
      return prices[Math.floor(prices.length / 2)];
    }
    const base = 15_000;
    const agePenalty = (new Date().getFullYear() - year) * 500;
    const mileagePenalty = mileage * 0.01;
    return Math.max(base - agePenalty - mileagePenalty, 1_000);
  }

  async detectSpam(text: string): Promise<boolean> {
    const spamWords = ['scam', 'free money', 'click here', 'guaranteed'];
    return spamWords.some(w => text.toLowerCase().includes(w));
  }

  scoreCandidate(anchor: any, candidate: any, ctx: any): number {
    let score = 0;
    const spec = candidate.vehicleSpec;
    const anchorSpec = anchor?.vehicleSpec;

    if (anchorSpec?.brand && spec?.brand?.id === anchorSpec.brand.id) score += W.BRAND_MATCH;

    if (ctx.budget && candidate.price) {
      const ratio = Math.abs(candidate.price - ctx.budget) / ctx.budget;
      if (ratio <= 0.1) score += W.PRICE_PROXIMITY;
      else if (ratio <= 0.25) score += W.PRICE_PROXIMITY * 0.5;
    }

    const country = ctx.country ?? 'DEFAULT';
    const affinityBrands = COUNTRY_BRAND_AFFINITY[country] ?? COUNTRY_BRAND_AFFINITY['DEFAULT']!;
    if (spec?.brand?.slug && affinityBrands.includes(spec.brand.slug)) score += W.COUNTRY_POPULARITY;

    if (ctx.searchHistory?.length && spec?.brand?.nameEn) {
      const hit = ctx.searchHistory.some((term: string) =>
        spec.brand.nameEn.toLowerCase().includes(term.toLowerCase()),
      );
      if (hit) score += W.SEARCH_KEYWORD;
    }

    return Math.min(score, 100);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// ChatService shim
// ─────────────────────────────────────────────────────────────────────────────

class ChatService {
  constructor(private prisma: any) {}

  private async assertMembership(chatId: string, userId: string) {
    const chat = await this.prisma.chat.findUnique({ where: { id: chatId }, select: { buyerId: true, sellerId: true } });
    if (!chat) throw new NotFoundException('Chat not found');
    if (chat.buyerId !== userId && chat.sellerId !== userId) throw new ForbiddenException('Access denied');
    return chat;
  }

  async getOrCreateChat(listingId: string, buyerId: string) {
    const listing = await this.prisma.listing.findUnique({ where: { id: listingId } });
    if (!listing) throw new NotFoundException('Listing not found');
    if (listing.userId === buyerId) throw new ForbiddenException('You cannot chat with yourself');
    const existing = await this.prisma.chat.findFirst({ where: { listingId, buyerId } });
    if (existing) return existing;
    return this.prisma.chat.create({ data: { listingId, buyerId, sellerId: listing.userId } });
  }

  async sendMessage(chatId: string, senderId: string, content: string) {
    await this.assertMembership(chatId, senderId);
    if (!content?.trim()) throw new Error('Message content cannot be empty');
    return this.prisma.message.create({ data: { chatId, senderId, content: content.trim() } });
  }

  async getMessages(chatId: string, userId: string) {
    await this.assertMembership(chatId, userId);
    return this.prisma.message.findMany({ where: { chatId }, orderBy: { createdAt: 'asc' } });
  }

  async deleteMessage(messageId: string, userId: string) {
    const msg = await this.prisma.message.findUnique({ where: { id: messageId } });
    if (!msg) throw new NotFoundException('Message not found');
    if (msg.senderId !== userId) throw new ForbiddenException('Cannot delete another user\'s message');
    return this.prisma.message.update({ where: { id: messageId }, data: { deletedAt: new Date() } });
  }
}

// ─────────────────────────────────────────────────────────────────────────────

describe('DealersService', () => {
  let prisma: ReturnType<typeof mockPrisma>;
  let cache:  ReturnType<typeof mockCache>;
  let svc:    DealersService;

  beforeEach(() => {
    prisma = mockPrisma(); cache = mockCache();
    svc = new DealersService(prisma, cache);
  });

  describe('create()', () => {
    const dto = { nameEn: 'Baghdad Motors', nameKu: 'بەغدا موتۆرز', nameAr: 'موتورز بغداد', phone: '+9641234567' };

    it('creates dealer profile for valid user', async () => {
      prisma.dealer.findUnique.mockResolvedValue(null);
      prisma.dealer.create.mockResolvedValue({ id: 'd1', slug: 'baghdad-motors', ...dto });

      const result = await svc.create('user-uuid-1111', dto);
      expect(result.slug).toBe('baghdad-motors');
      expect(prisma.dealer.create).toHaveBeenCalledTimes(1);
    });

    it('throws ConflictException if dealer profile already exists', async () => {
      prisma.dealer.findUnique.mockResolvedValue({ id: 'existing-dealer' });
      await expect(svc.create('user-uuid-1111', dto)).rejects.toThrow(ConflictException);
      expect(prisma.dealer.create).not.toHaveBeenCalled();
    });

    it('invalidates dealers list cache on creation', async () => {
      prisma.dealer.findUnique.mockResolvedValue(null);
      prisma.dealer.create.mockResolvedValue({ id: 'd1', slug: 'baghdad-motors' });
      await svc.create('user-uuid-1111', dto);
      expect(cache.del).toHaveBeenCalledWith('dealers:list:');
    });
  });

  describe('findAll()', () => {
    it('filters only VERIFIED dealers', async () => {
      prisma.dealer.findMany.mockResolvedValue([]);
      prisma.dealer.count.mockResolvedValue(0);
      cache.getOrSet.mockImplementation((_k: any, f: any) => f());

      await svc.findAll({});
      expect(prisma.dealer.findMany.mock.calls[0][0].where.status).toBe('VERIFIED');
    });

    it('caps limit at 50', async () => {
      prisma.dealer.findMany.mockResolvedValue([]);
      prisma.dealer.count.mockResolvedValue(0);
      cache.getOrSet.mockImplementation((_k: any, f: any) => f());

      await svc.findAll({ limit: 999 });
      expect(prisma.dealer.findMany.mock.calls[0][0].take).toBe(50);
    });

    it('applies city filter with insensitive mode', async () => {
      prisma.dealer.findMany.mockResolvedValue([]);
      prisma.dealer.count.mockResolvedValue(0);
      cache.getOrSet.mockImplementation((_k: any, f: any) => f());

      await svc.findAll({ city: 'Erbil' });
      const where = prisma.dealer.findMany.mock.calls[0][0].where;
      expect(where.location?.city?.contains).toBe('Erbil');
    });

    it('applies minRating filter', async () => {
      prisma.dealer.findMany.mockResolvedValue([]);
      prisma.dealer.count.mockResolvedValue(0);
      cache.getOrSet.mockImplementation((_k: any, f: any) => f());

      await svc.findAll({ minRating: 4 });
      const where = prisma.dealer.findMany.mock.calls[0][0].where;
      expect(where.averageRating).toEqual({ gte: 4 });
    });

    it('uses 30-second cache TTL', async () => {
      prisma.dealer.findMany.mockResolvedValue([]);
      prisma.dealer.count.mockResolvedValue(0);
      await svc.findAll({});
      expect(cache.getOrSet.mock.calls[0][2]).toBe(30_000);
    });

    it('returns pagination metadata', async () => {
      prisma.dealer.findMany.mockResolvedValue([{ id: 'd1' }]);
      prisma.dealer.count.mockResolvedValue(43);
      cache.getOrSet.mockImplementation((_k: any, f: any) => f());

      const result = await svc.findAll({ page: 2, limit: 20 });
      expect(result).toMatchObject({ total: 43, page: 2, pages: 3 });
    });
  });

  describe('findBySlug()', () => {
    it('returns verified dealer', async () => {
      cache.getOrSet.mockResolvedValue({ id: 'd1', slug: 'test', status: 'VERIFIED' });
      const result = await svc.findBySlug('test');
      expect(result.slug).toBe('test');
    });

    it('throws NotFoundException for unverified dealer', async () => {
      cache.getOrSet.mockResolvedValue({ id: 'd1', slug: 'test', status: 'PENDING' });
      await expect(svc.findBySlug('test')).rejects.toThrow(NotFoundException);
    });

    it('throws NotFoundException for null result', async () => {
      cache.getOrSet.mockResolvedValue(null);
      await expect(svc.findBySlug('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('createReview()', () => {
    it('prevents dealer owner from reviewing their own dealership', async () => {
      prisma.dealer.findUnique.mockResolvedValue({ id: 'd1', userId: 'owner-id' });
      await expect(svc.createReview('owner-id', 'some-dealer', { rating: 5, comment: 'Great' }))
        .rejects.toThrow(ForbiddenException);
    });

    it('throws NotFoundException for unknown dealer slug', async () => {
      prisma.dealer.findUnique.mockResolvedValue(null);
      await expect(svc.createReview('reviewer-id', 'bad-slug', { rating: 4 }))
        .rejects.toThrow(NotFoundException);
    });

    it('creates review and updates dealer rating atomically', async () => {
      prisma.dealer.findUnique.mockResolvedValue({ id: 'd1', userId: 'dealer-owner' });
      const txMock = {
        dealerReview: {
          create: jest.fn().mockResolvedValue({ id: 'r1', rating: 4 }),
          aggregate: jest.fn().mockResolvedValue({ _avg: { rating: 4.2 }, _count: { id: 5 } }),
        },
        dealer: { update: jest.fn().mockResolvedValue({}) },
      };
      prisma.$transaction.mockImplementation((fn: any) => fn(txMock));

      await svc.createReview('reviewer-id', 'test-dealer', { rating: 4, comment: 'Good' });
      expect(txMock.dealer.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ averageRating: 4.2, totalReviews: 5 }) }),
      );
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('AiService', () => {
  let prisma: ReturnType<typeof mockPrisma>;
  let svc:    AiService;

  beforeEach(() => {
    prisma = mockPrisma();
    svc = new AiService(prisma);
  });

  describe('suggestPrice()', () => {
    it('returns median of comparable listings when ≥3 found', async () => {
      prisma.listing.findMany.mockResolvedValue([
        { price: 10_000 }, { price: 20_000 }, { price: 30_000 },
      ]);
      const price = await svc.suggestPrice('Toyota', 'Corolla', 2020, 50_000);
      expect(price).toBe(20_000); // median
    });

    it('uses heuristic fallback when fewer than 3 comparables', async () => {
      prisma.listing.findMany.mockResolvedValue([{ price: 25_000 }]);
      const price = await svc.suggestPrice('Toyota', 'Corolla', 2020, 50_000);
      expect(typeof price).toBe('number');
      expect(price).toBeGreaterThan(0);
    });

    it('never returns negative price', async () => {
      prisma.listing.findMany.mockResolvedValue([]);
      const price = await svc.suggestPrice('Toyota', 'Corolla', 1990, 500_000);
      expect(price).toBeGreaterThanOrEqual(1_000);
    });

    it('returns at least floor of 1000 for very old/high-mileage vehicle', async () => {
      prisma.listing.findMany.mockResolvedValue([]);
      const price = await svc.suggestPrice('Unknown', 'Unknown', 1960, 9_999_999);
      expect(price).toBe(1_000);
    });
  });

  describe('detectSpam()', () => {
    it('detects "scam" keyword', async () => {
      expect(await svc.detectSpam('This is a scam listing')).toBe(true);
    });

    it('detects "free money" phrase', async () => {
      expect(await svc.detectSpam('Win free money now')).toBe(true);
    });

    it('detects case-insensitively', async () => {
      expect(await svc.detectSpam('CLICK HERE to win')).toBe(true);
    });

    it('returns false for clean text', async () => {
      expect(await svc.detectSpam('Toyota Land Cruiser 2022 excellent condition')).toBe(false);
    });
  });

  describe('scoreCandidate()', () => {
    const anchor = { vehicleSpec: { brand: { id: 'brand-toyota', slug: 'toyota' }, model: { id: 'model-lc' } } };
    const candidate = { price: 45_000, vehicleSpec: { brand: { id: 'brand-toyota', slug: 'toyota', nameEn: 'Toyota' }, model: { id: 'model-lc' } } };

    it('awards BRAND_MATCH score when brands match', () => {
      const score = svc.scoreCandidate(anchor, candidate, {});
      expect(score).toBeGreaterThanOrEqual(W.BRAND_MATCH);
    });

    it('awards PRICE_PROXIMITY when price is within 10% of budget', () => {
      const score = svc.scoreCandidate(null, { ...candidate, price: 20_000 }, { budget: 20_500 });
      expect(score).toBeGreaterThanOrEqual(W.PRICE_PROXIMITY);
    });

    it('awards 50% PRICE_PROXIMITY for 10–25% budget range', () => {
      const score = svc.scoreCandidate(null, { ...candidate, price: 20_000 }, { budget: 24_000 });
      expect(score).toBeGreaterThanOrEqual(W.PRICE_PROXIMITY * 0.5);
    });

    it('awards COUNTRY_POPULARITY for IQ market (Toyota is popular)', () => {
      const score = svc.scoreCandidate(null, candidate, { country: 'IQ' });
      expect(score).toBeGreaterThanOrEqual(W.COUNTRY_POPULARITY);
    });

    it('awards SEARCH_KEYWORD when brand matches search history', () => {
      const score = svc.scoreCandidate(null, candidate, { searchHistory: ['toyota'] });
      expect(score).toBeGreaterThanOrEqual(W.SEARCH_KEYWORD);
    });

    it('caps total score at 100', () => {
      // All signals present — score should never exceed 100
      const score = svc.scoreCandidate(
        anchor, candidate,
        { budget: 45_000, country: 'IQ', searchHistory: ['toyota'] },
      );
      expect(score).toBeLessThanOrEqual(100);
    });

    it('returns 0 for no matching signals', () => {
      const unrelated = { price: 999_999, vehicleSpec: { brand: { id: 'brand-bmw', slug: 'bmw', nameEn: 'BMW' } } };
      const score = svc.scoreCandidate(null, unrelated, {});
      expect(score).toBe(0);
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('ChatService', () => {
  let prisma: ReturnType<typeof mockPrisma>;
  let svc:    ChatService;

  beforeEach(() => {
    prisma = mockPrisma();
    svc = new ChatService(prisma);
  });

  describe('getOrCreateChat()', () => {
    it('throws NotFoundException for missing listing', async () => {
      prisma.listing.findUnique.mockResolvedValue(null);
      await expect(svc.getOrCreateChat('bad-id', 'buyer-id')).rejects.toThrow(NotFoundException);
    });

    it('prevents seller from opening chat on their own listing (self-chat)', async () => {
      prisma.listing.findUnique.mockResolvedValue(makeListing({ userId: 'seller-id' }));
      await expect(svc.getOrCreateChat('listing-uuid-5555', 'seller-id')).rejects.toThrow(ForbiddenException);
    });

    it('returns existing chat if one already exists', async () => {
      prisma.listing.findUnique.mockResolvedValue(makeListing({ userId: 'seller-id' }));
      prisma.chat.findFirst.mockResolvedValue({ id: 'chat-1', buyerId: 'buyer-id', sellerId: 'seller-id' });

      const result = await svc.getOrCreateChat('listing-uuid-5555', 'buyer-id');
      expect(result.id).toBe('chat-1');
      expect(prisma.chat.create).not.toHaveBeenCalled();
    });

    it('creates new chat when none exists', async () => {
      prisma.listing.findUnique.mockResolvedValue(makeListing({ userId: 'seller-id' }));
      prisma.chat.findFirst.mockResolvedValue(null);
      prisma.chat.create.mockResolvedValue({ id: 'new-chat', buyerId: 'buyer-id', sellerId: 'seller-id' });

      const result = await svc.getOrCreateChat('listing-uuid-5555', 'buyer-id');
      expect(result.id).toBe('new-chat');
    });
  });

  describe('sendMessage()', () => {
    it('rejects message from non-participant', async () => {
      prisma.chat.findUnique.mockResolvedValue({ buyerId: 'buyer-id', sellerId: 'seller-id' });
      await expect(svc.sendMessage('chat-1', 'intruder-id', 'Hello!')).rejects.toThrow(ForbiddenException);
    });

    it('rejects empty message content', async () => {
      prisma.chat.findUnique.mockResolvedValue({ buyerId: 'buyer-id', sellerId: 'seller-id' });
      await expect(svc.sendMessage('chat-1', 'buyer-id', '   ')).rejects.toThrow();
    });

    it('allows buyer to send message', async () => {
      prisma.chat.findUnique.mockResolvedValue({ buyerId: 'buyer-id', sellerId: 'seller-id' });
      prisma.message.create.mockResolvedValue({ id: 'm1', content: 'Hello', senderId: 'buyer-id' });

      const msg = await svc.sendMessage('chat-1', 'buyer-id', 'Hello');
      expect(msg.id).toBe('m1');
    });

    it('trims whitespace from message content', async () => {
      prisma.chat.findUnique.mockResolvedValue({ buyerId: 'buyer-id', sellerId: 'seller-id' });
      prisma.message.create.mockResolvedValue({ id: 'm1', content: 'Hello' });

      await svc.sendMessage('chat-1', 'buyer-id', '  Hello  ');
      expect(prisma.message.create.mock.calls[0][0].data.content).toBe('Hello');
    });
  });

  describe('getMessages()', () => {
    it('throws ForbiddenException for non-participant', async () => {
      prisma.chat.findUnique.mockResolvedValue({ buyerId: 'buyer-id', sellerId: 'seller-id' });
      await expect(svc.getMessages('chat-1', 'stranger-id')).rejects.toThrow(ForbiddenException);
    });

    it('allows seller to read messages', async () => {
      prisma.chat.findUnique.mockResolvedValue({ buyerId: 'buyer-id', sellerId: 'seller-id' });
      prisma.message.findMany.mockResolvedValue([{ id: 'm1' }]);

      const msgs = await svc.getMessages('chat-1', 'seller-id');
      expect(msgs).toHaveLength(1);
    });
  });

  describe('deleteMessage()', () => {
    it('prevents deleting another user\'s message', async () => {
      prisma.message.findUnique.mockResolvedValue({ id: 'm1', senderId: 'original-sender' });
      await expect(svc.deleteMessage('m1', 'different-user')).rejects.toThrow(ForbiddenException);
    });

    it('soft-deletes (sets deletedAt) own message', async () => {
      prisma.message.findUnique.mockResolvedValue({ id: 'm1', senderId: 'user-id' });
      prisma.message.update.mockResolvedValue({ id: 'm1', deletedAt: new Date() });

      await svc.deleteMessage('m1', 'user-id');
      const updateData = prisma.message.update.mock.calls[0][0].data;
      expect(updateData.deletedAt).toBeInstanceOf(Date);
    });
  });
});
