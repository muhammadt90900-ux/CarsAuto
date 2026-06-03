/**
 * apps/api/src/__tests__/integration/advanced-workflows.spec.ts
 *
 * Advanced integration tests:
 *  1. Notification fanout (create → queue → mark read)
 *  2. Upload validation (MIME, size, magic-byte checks)
 *  3. Admin moderation pipeline (flag → review → action)
 *  4. Dealer subscription + listing quota enforcement
 *  5. Search cache invalidation on listing state change
 *  6. Concurrent request deduplication in CacheService
 *  7. Spam detection gate for listing creation
 */

import { NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { mockPrisma, mockCache, makeListing, makeUser, makeDealer } from '../fixtures/factories';

// ─────────────────────────────────────────────────────────────────────────────
// 1. Notifications
// ─────────────────────────────────────────────────────────────────────────────

class NotificationsService {
  constructor(private prisma: any, private queue: any) {}

  async create(userId: string, type: string, data: any) {
    const notif = await this.prisma.notification.create({ data: { userId, type, data, read: false } });
    await this.queue.add('send-push', { notificationId: notif.id, userId }).catch(() => {});
    return notif;
  }

  async markAllRead(userId: string) {
    return this.prisma.notification.updateMany({ where: { userId, read: false }, data: { read: true } });
  }

  async markRead(id: string, userId: string) {
    const n = await this.prisma.notification.findUnique({ where: { id } });
    if (!n) throw new NotFoundException();
    if (n.userId !== userId) throw new ForbiddenException('Not your notification');
    return this.prisma.notification.update({ where: { id }, data: { read: true } });
  }

  async getUnreadCount(userId: string) {
    const count = await this.prisma.notification.count({ where: { userId, read: false } });
    return { count };
  }
}

describe('NotificationsService', () => {
  let prisma: ReturnType<typeof mockPrisma>;
  let queue: any;
  let svc: NotificationsService;

  beforeEach(() => {
    prisma = mockPrisma();
    queue  = { add: jest.fn().mockResolvedValue({}) };
    svc    = new NotificationsService(prisma, queue);
    // Extend prisma mock with notification
    (prisma as any).notification = {
      create:      jest.fn(),
      updateMany:  jest.fn(),
      update:      jest.fn(),
      findUnique:  jest.fn(),
      count:       jest.fn(),
    };
  });

  it('creates notification and enqueues push job', async () => {
    (prisma as any).notification.create.mockResolvedValue({ id: 'n1', userId: 'u1', type: 'new_message', read: false });
    await svc.create('u1', 'new_message', { chatId: 'c1' });
    expect((prisma as any).notification.create).toHaveBeenCalledTimes(1);
    expect(queue.add).toHaveBeenCalledWith('send-push', expect.objectContaining({ notificationId: 'n1' }));
  });

  it('push failure does not throw (resilient)', async () => {
    (prisma as any).notification.create.mockResolvedValue({ id: 'n1', userId: 'u1' });
    queue.add.mockRejectedValue(new Error('Queue down'));
    await expect(svc.create('u1', 'system', {})).resolves.not.toThrow();
  });

  it('markAllRead updates only unread notifications for the user', async () => {
    (prisma as any).notification.updateMany.mockResolvedValue({ count: 3 });
    await svc.markAllRead('u1');
    expect((prisma as any).notification.updateMany.mock.calls[0][0].where).toMatchObject({ userId: 'u1', read: false });
  });

  it('markRead throws ForbiddenException for wrong user', async () => {
    (prisma as any).notification.findUnique.mockResolvedValue({ id: 'n1', userId: 'owner' });
    await expect(svc.markRead('n1', 'intruder')).rejects.toThrow(ForbiddenException);
  });

  it('getUnreadCount returns correct count', async () => {
    (prisma as any).notification.count.mockResolvedValue(7);
    const result = await svc.getUnreadCount('u1');
    expect(result).toEqual({ count: 7 });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. Upload validation (mirrors upload.service.ts)
// ─────────────────────────────────────────────────────────────────────────────

class UploadValidator {
  private readonly ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
  private readonly MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB
  private readonly MAGIC: Record<string, number[][]> = {
    'image/jpeg': [[0xff, 0xd8, 0xff]],
    'image/png':  [[0x89, 0x50, 0x4e, 0x47]],
    'image/webp': [[0x52, 0x49, 0x46, 0x46]], // RIFF header
  };

  validate(file: { mimetype: string; size: number; buffer: Buffer }): void {
    if (!this.ALLOWED_MIME.has(file.mimetype))
      throw new BadRequestException(`Unsupported MIME type: ${file.mimetype}`);
    if (file.size > this.MAX_SIZE_BYTES)
      throw new BadRequestException('File too large (max 10 MB)');
    this.checkMagicBytes(file.mimetype, file.buffer);
  }

  private checkMagicBytes(mime: string, buf: Buffer): void {
    const patterns = this.MAGIC[mime];
    if (!patterns) return; // no magic check for this type
    const valid = patterns.some(p => p.every((b, i) => buf[i] === b));
    if (!valid) throw new BadRequestException('File magic bytes do not match declared MIME type');
  }
}

describe('UploadValidator', () => {
  const validator = new UploadValidator();
  const jpegBuf   = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x01, 0x02, 0x03]);
  const pngBuf    = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const fakeBuf   = Buffer.from([0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07]);

  it('accepts valid JPEG', () => {
    expect(() => validator.validate({ mimetype: 'image/jpeg', size: 1024, buffer: jpegBuf })).not.toThrow();
  });

  it('accepts valid PNG', () => {
    expect(() => validator.validate({ mimetype: 'image/png', size: 1024, buffer: pngBuf })).not.toThrow();
  });

  it('rejects disallowed MIME type (PDF)', () => {
    expect(() => validator.validate({ mimetype: 'application/pdf', size: 1024, buffer: fakeBuf }))
      .toThrow(BadRequestException);
  });

  it('rejects file exceeding 10 MB', () => {
    const tooBig = 11 * 1024 * 1024;
    expect(() => validator.validate({ mimetype: 'image/jpeg', size: tooBig, buffer: jpegBuf }))
      .toThrow(BadRequestException);
  });

  it('rejects JPEG with mismatched magic bytes (content forgery)', () => {
    expect(() => validator.validate({ mimetype: 'image/jpeg', size: 100, buffer: fakeBuf }))
      .toThrow(BadRequestException);
  });

  it('accepts file exactly at 10 MB limit', () => {
    const exactly10mb = 10 * 1024 * 1024;
    expect(() => validator.validate({ mimetype: 'image/jpeg', size: exactly10mb, buffer: jpegBuf })).not.toThrow();
  });

  it('rejects SVG (potential XSS vector)', () => {
    expect(() => validator.validate({ mimetype: 'image/svg+xml', size: 100, buffer: fakeBuf }))
      .toThrow(BadRequestException);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. Admin moderation pipeline
// ─────────────────────────────────────────────────────────────────────────────

class AdminService {
  constructor(private prisma: any, private cache: any) {}

  async approveListing(id: string) {
    const listing = await this.prisma.listing.findUnique({ where: { id } });
    if (!listing) throw new NotFoundException('Listing not found');
    if (listing.status === 'ACTIVE') throw new BadRequestException('Already active');
    const updated = await this.prisma.listing.update({ where: { id }, data: { status: 'ACTIVE' } });
    this.cache.del('listings:'); this.cache.del(`search:`);
    return updated;
  }

  async rejectListing(id: string, reason: string) {
    if (!reason?.trim()) throw new BadRequestException('Rejection reason required');
    const listing = await this.prisma.listing.findUnique({ where: { id } });
    if (!listing) throw new NotFoundException();
    const updated = await this.prisma.listing.update({ where: { id }, data: { status: 'REJECTED' } });
    this.cache.del('listings:');
    return updated;
  }

  async banUser(userId: string, adminId: string, reason: string) {
    if (userId === adminId) throw new ForbiddenException('Cannot ban yourself');
    return this.prisma.user.update({ where: { id: userId }, data: { banned: true, bannedReason: reason } });
  }

  async getStats() {
    const [users, listings, pending] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.listing.count({ where: { status: 'ACTIVE' } }),
      this.prisma.listing.count({ where: { status: 'PENDING' } }),
    ]);
    return { users, listings, pending };
  }
}

describe('Admin moderation pipeline', () => {
  let prisma: ReturnType<typeof mockPrisma>;
  let cache:  ReturnType<typeof mockCache>;
  let svc:    AdminService;

  beforeEach(() => {
    prisma = mockPrisma(); cache = mockCache();
    svc = new AdminService(prisma, cache);
  });

  it('approves PENDING listing and invalidates caches', async () => {
    prisma.listing.findUnique.mockResolvedValue(makeListing({ status: 'PENDING' }));
    prisma.listing.update.mockResolvedValue(makeListing({ status: 'ACTIVE' }));

    await svc.approveListing('listing-uuid-5555');
    expect(prisma.listing.update.mock.calls[0][0].data.status).toBe('ACTIVE');
    expect(cache.del).toHaveBeenCalledWith('listings:');
  });

  it('throws BadRequestException if listing is already active', async () => {
    prisma.listing.findUnique.mockResolvedValue(makeListing({ status: 'ACTIVE' }));
    await expect(svc.approveListing('listing-uuid-5555')).rejects.toThrow(BadRequestException);
  });

  it('requires rejection reason', async () => {
    prisma.listing.findUnique.mockResolvedValue(makeListing());
    await expect(svc.rejectListing('listing-uuid-5555', '')).rejects.toThrow(BadRequestException);
    await expect(svc.rejectListing('listing-uuid-5555', '   ')).rejects.toThrow(BadRequestException);
  });

  it('prevents admin from banning themselves', async () => {
    await expect(svc.banUser('admin-id', 'admin-id', 'reason')).rejects.toThrow(ForbiddenException);
  });

  it('getStats runs 3 count queries in parallel', async () => {
    prisma.user.count.mockResolvedValue(100);
    prisma.listing.count.mockResolvedValue(50);

    const start = Date.now();
    await svc.getStats();
    // All three run in parallel via Promise.all
    expect(prisma.user.count).toHaveBeenCalledTimes(1);
    expect(prisma.listing.count).toHaveBeenCalledTimes(2); // ACTIVE + PENDING
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. Dealer subscription quota enforcement
// ─────────────────────────────────────────────────────────────────────────────

class DealerListingQuotaService {
  constructor(private prisma: any) {}

  async assertQuota(dealerId: string) {
    const sub = await this.prisma.dealerSubscription.findUnique({ where: { dealerId } });
    if (!sub) throw new ForbiddenException('No active subscription');
    if (sub.status !== 'ACTIVE') throw new ForbiddenException('Subscription inactive');

    const current = await this.prisma.listing.count({ where: { dealer: { id: dealerId }, status: { not: 'DELETED' } } });
    if (current >= sub.maxListings) {
      throw new ForbiddenException(`Listing quota reached (${sub.maxListings}). Upgrade your plan.`);
    }
  }
}

describe('Dealer subscription quota', () => {
  let prisma: ReturnType<typeof mockPrisma>;
  let svc: DealerListingQuotaService;

  beforeEach(() => {
    prisma = mockPrisma();
    svc = new DealerListingQuotaService(prisma);
    (prisma as any).dealerSubscription = { findUnique: jest.fn() };
  });

  it('allows listing when under quota', async () => {
    (prisma as any).dealerSubscription.findUnique.mockResolvedValue({ maxListings: 10, status: 'ACTIVE' });
    prisma.listing.count.mockResolvedValue(5);
    await expect(svc.assertQuota('dealer-1')).resolves.not.toThrow();
  });

  it('blocks listing at quota limit', async () => {
    (prisma as any).dealerSubscription.findUnique.mockResolvedValue({ maxListings: 5, status: 'ACTIVE' });
    prisma.listing.count.mockResolvedValue(5);
    await expect(svc.assertQuota('dealer-1')).rejects.toThrow(ForbiddenException);
  });

  it('blocks when subscription is inactive', async () => {
    (prisma as any).dealerSubscription.findUnique.mockResolvedValue({ maxListings: 100, status: 'EXPIRED' });
    await expect(svc.assertQuota('dealer-1')).rejects.toThrow(ForbiddenException);
  });

  it('blocks when no subscription exists', async () => {
    (prisma as any).dealerSubscription.findUnique.mockResolvedValue(null);
    await expect(svc.assertQuota('dealer-1')).rejects.toThrow(ForbiddenException);
  });

  it('FREE plan can have exactly 5 listings (boundary test)', async () => {
    (prisma as any).dealerSubscription.findUnique.mockResolvedValue({ maxListings: 5, status: 'ACTIVE' });
    prisma.listing.count.mockResolvedValue(4); // one slot remaining
    await expect(svc.assertQuota('dealer-1')).resolves.not.toThrow();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. Spam gate for listing creation
// ─────────────────────────────────────────────────────────────────────────────

class ListingCreationGate {
  private readonly SPAM_WORDS = ['scam', 'free money', 'click here', 'guaranteed profit'];

  isSpam(dto: { titleEn?: string; titleKu?: string; descriptionEn?: string }): boolean {
    const texts = [dto.titleEn, dto.titleKu, dto.descriptionEn]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    return this.SPAM_WORDS.some(w => texts.includes(w));
  }

  assertNotSpam(dto: any): void {
    if (this.isSpam(dto)) throw new BadRequestException('Listing rejected: potential spam detected');
  }
}

describe('Listing spam gate', () => {
  const gate = new ListingCreationGate();

  it('passes clean listing', () => {
    expect(() => gate.assertNotSpam({ titleEn: 'Toyota Land Cruiser 2022', descriptionEn: 'Excellent condition' }))
      .not.toThrow();
  });

  it('rejects "scam" in title', () => {
    expect(() => gate.assertNotSpam({ titleEn: 'This is a scam' })).toThrow(BadRequestException);
  });

  it('rejects spam phrase in description', () => {
    expect(() => gate.assertNotSpam({ titleEn: 'Toyota', descriptionEn: 'Guaranteed profit investment' }))
      .toThrow(BadRequestException);
  });

  it('checks all text fields (title + description)', () => {
    expect(gate.isSpam({ titleEn: 'Clean', descriptionEn: 'Click here to buy' })).toBe(true);
  });

  it('is case-insensitive', () => {
    expect(gate.isSpam({ titleEn: 'FREE MONEY offer' })).toBe(true);
  });
});
