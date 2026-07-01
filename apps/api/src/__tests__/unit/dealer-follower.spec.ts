// apps/api/src/__tests__/unit/dealer-follower.spec.ts
// FEATURE 9 — Dealer Follower System unit tests

import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, BadRequestException, NotFoundException } from '@nestjs/common';
import { DealersService } from '../../modules/dealers/dealers.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CacheService } from '../../common/cache/cache.service';
import { NotificationsService } from '../../modules/notifications/notifications.service';
import { EventEmitter2 } from '@nestjs/event-emitter';

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockPrisma = {
  dealer: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
  },
  dealerFollower: {
    create: jest.fn(),
    deleteMany: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
  },
};

const mockCache = {
  getOrSet: jest.fn((_key: string, factory: () => Promise<unknown>) => factory()),
  del: jest.fn(),
};

const mockNotifications = {
  create: jest.fn().mockResolvedValue({}),
};

const mockEventEmitter = {
  emit: jest.fn(),
};

const VERIFIED_DEALER = {
  id: 'dealer-1',
  userId: 'dealer-owner-1',
  slug: 'premium-motors',
  nameEn: 'Premium Motors',
  nameKu: 'پریمیئەم مۆتۆرز',
  status: 'VERIFIED',
  _count: { followers: 4 },
};

describe('DealersService — Follower System (Feature 9)', () => {
  let service: DealersService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DealersService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: CacheService, useValue: mockCache },
        { provide: NotificationsService, useValue: mockNotifications },
        { provide: EventEmitter2, useValue: mockEventEmitter },
      ],
    }).compile();

    service = module.get<DealersService>(DealersService);
  });

  // ── follow() ────────────────────────────────────────────────────────────

  describe('follow', () => {
    it('creates a follower record and returns incremented count', async () => {
      mockPrisma.dealer.findUnique.mockResolvedValue(VERIFIED_DEALER);
      mockPrisma.dealerFollower.create.mockResolvedValue({ id: 'follow-1' });

      const result = await service.follow('user-1', 'dealer-1');

      expect(mockPrisma.dealerFollower.create).toHaveBeenCalledWith({
        data: { userId: 'user-1', dealerId: 'dealer-1' },
      });
      expect(result.followerCount).toBe(5);
      expect(mockNotifications.create).toHaveBeenCalled();
      expect(mockCache.del).toHaveBeenCalledWith('dealers:detail:premium-motors');
    });

    it('throws NotFoundException for non-existent or unverified dealer', async () => {
      mockPrisma.dealer.findUnique.mockResolvedValue(null);
      await expect(service.follow('user-1', 'dealer-x')).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException when following own dealership', async () => {
      mockPrisma.dealer.findUnique.mockResolvedValue(VERIFIED_DEALER);
      await expect(service.follow('dealer-owner-1', 'dealer-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('throws ConflictException when already following (P2002)', async () => {
      mockPrisma.dealer.findUnique.mockResolvedValue(VERIFIED_DEALER);
      mockPrisma.dealerFollower.create.mockRejectedValue({ code: 'P2002' });

      await expect(service.follow('user-1', 'dealer-1')).rejects.toThrow(ConflictException);
    });
  });

  // ── unfollow() ──────────────────────────────────────────────────────────

  describe('unfollow', () => {
    it('deletes the follower record and returns decremented count', async () => {
      mockPrisma.dealer.findUnique.mockResolvedValue(VERIFIED_DEALER);
      mockPrisma.dealerFollower.deleteMany.mockResolvedValue({ count: 1 });

      const result = await service.unfollow('user-1', 'dealer-1');

      expect(mockPrisma.dealerFollower.deleteMany).toHaveBeenCalledWith({
        where: { userId: 'user-1', dealerId: 'dealer-1' },
      });
      expect(result.followerCount).toBe(3);
    });

    it('is idempotent — does not throw if not following', async () => {
      mockPrisma.dealer.findUnique.mockResolvedValue({ ...VERIFIED_DEALER, _count: { followers: 0 } });
      mockPrisma.dealerFollower.deleteMany.mockResolvedValue({ count: 0 });

      const result = await service.unfollow('user-1', 'dealer-1');
      expect(result.followerCount).toBe(0);
    });

    it('throws NotFoundException for non-existent dealer', async () => {
      mockPrisma.dealer.findUnique.mockResolvedValue(null);
      await expect(service.unfollow('user-1', 'dealer-x')).rejects.toThrow(NotFoundException);
    });
  });

  // ── isFollowing() ───────────────────────────────────────────────────────

  describe('isFollowing', () => {
    it('returns true when a follower record exists', async () => {
      mockPrisma.dealerFollower.findUnique.mockResolvedValue({ id: 'follow-1' });
      const result = await service.isFollowing('user-1', 'dealer-1');
      expect(result).toBe(true);
    });

    it('returns false when no follower record exists', async () => {
      mockPrisma.dealerFollower.findUnique.mockResolvedValue(null);
      const result = await service.isFollowing('user-1', 'dealer-1');
      expect(result).toBe(false);
    });
  });

  // ── getFollowers() ──────────────────────────────────────────────────────

  describe('getFollowers', () => {
    it('returns paginated follower list for a verified dealer', async () => {
      mockPrisma.dealer.findUnique.mockResolvedValue({ id: 'dealer-1', status: 'VERIFIED' });
      mockPrisma.dealerFollower.findMany.mockResolvedValue([
        { user: { id: 'u1', name: 'Ahmad', avatar: null }, createdAt: new Date('2026-01-01') },
      ]);
      mockPrisma.dealerFollower.count.mockResolvedValue(1);

      const result = await service.getFollowers('dealer-1', 1, 20);

      expect(result.total).toBe(1);
      expect(result.followers[0].name).toBe('Ahmad');
    });

    it('throws NotFoundException if dealer is not verified', async () => {
      mockPrisma.dealer.findUnique.mockResolvedValue({ id: 'dealer-1', status: 'PENDING' });
      await expect(service.getFollowers('dealer-1')).rejects.toThrow(NotFoundException);
    });
  });

  // ── notifyFollowersOfNewListing() ───────────────────────────────────────

  describe('notifyFollowersOfNewListing', () => {
    it('sends a notification to every follower', async () => {
      mockPrisma.dealer.findUnique.mockResolvedValue({
        nameKu: 'پریمیئەم مۆتۆرز', nameEn: 'Premium Motors', slug: 'premium-motors',
      });
      mockPrisma.dealerFollower.findMany.mockResolvedValue([
        { userId: 'u1' }, { userId: 'u2' },
      ]);

      await service.notifyFollowersOfNewListing('dealer-1', 'listing-1', 'Toyota Camry 2024');

      expect(mockNotifications.create).toHaveBeenCalledTimes(2);
    });

    it('does nothing when dealer has no followers', async () => {
      mockPrisma.dealer.findUnique.mockResolvedValue({
        nameKu: 'x', nameEn: 'x', slug: 'x',
      });
      mockPrisma.dealerFollower.findMany.mockResolvedValue([]);

      await service.notifyFollowersOfNewListing('dealer-1', 'listing-1', 'Title');
      expect(mockNotifications.create).not.toHaveBeenCalled();
    });

    it('does nothing when dealer does not exist', async () => {
      mockPrisma.dealer.findUnique.mockResolvedValue(null);
      await service.notifyFollowersOfNewListing('dealer-x', 'listing-1', 'Title');
      expect(mockPrisma.dealerFollower.findMany).not.toHaveBeenCalled();
    });
  });
});
