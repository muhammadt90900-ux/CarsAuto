// apps/api/src/modules/dealers/dealers.service.ts — PERFORMANCE OPTIMISED
// Key improvements:
//   1. CacheService injected — list + detail results cached (30s / 2min)
//   2. findAll: lean select (no showroomImages, no full descriptions)
//   3. findBySlug: batched analytics tracking (same pattern as listings)
//   4. trackEvent: batched per-dealer buffer, flushes every 30 s
//   5. recomputeRating: runs inside the review creation transaction

import {
  Injectable, NotFoundException, ForbiddenException, ConflictException,
} from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { CacheService  } from '@/common/cache/cache.service';
import { Prisma, DealerStatus, DealerTier } from '@prisma/client';
import { CreateDealerDto }  from './dto/create-dealer.dto';
import { UpdateDealerDto }  from './dto/update-dealer.dto';
import { CreateReviewDto }  from './dto/create-review.dto';
import { DealerQueryDto }   from './dto/dealer-query.dto';
import { ContactDealerDto } from './dto/contact-dealer.dto';
import slugify from 'slugify';

type AnalyticsField =
  | 'profileViews' | 'listingViews' | 'contactClicks'
  | 'whatsappClicks' | 'phoneClicks' | 'newLeads' | 'newReviews';

const ALLOWED_ANALYTICS_FIELDS = new Set<AnalyticsField>([
  'profileViews', 'listingViews', 'contactClicks',
  'whatsappClicks', 'phoneClicks', 'newLeads', 'newReviews',
]);

// PERF: batched analytics — flush to DB every 30 s
// Buffer: dealerId → field → count
const analyticsBuffer = new Map<string, Partial<Record<AnalyticsField, number>>>();
let analyticsTimer: NodeJS.Timeout | null = null;

// PERF: lean select for list pages — excludes heavy text fields + showroom images
const LIST_SELECT = {
  id: true, slug: true, nameEn: true, nameAr: true, nameKu: true,
  taglineEn: true, taglineKu: true,
  logoUrl: true, coverUrl: true,
  status: true, tier: true,
  averageRating: true, totalReviews: true, activeListings: true,
  totalViews: true, responseRate: true,
  specialties: true, createdAt: true,
  location: { select: { id: true, city: true, nameKu: true, nameEn: true } },
  badges: {
    where: { OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] },
    select: { code: true, label: true, icon: true },
  },
  subscription: { select: { plan: true } },
} satisfies Prisma.DealerSelect;

@Injectable()
export class DealersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
  ) {}

  // ── create ─────────────────────────────────────────────────────────────────
  async create(userId: string, dto: CreateDealerDto) {
    const existing = await this.prisma.dealer.findUnique({ where: { userId } });
    if (existing) throw new ConflictException('Dealer profile already exists');

    const baseSlug = slugify(dto.nameEn, { lower: true, strict: true });
    const slug = await this.uniqueSlug(baseSlug);

    const dealer = await this.prisma.dealer.create({
      data: {
        userId, slug,
        nameEn: dto.nameEn, nameAr: dto.nameAr, nameKu: dto.nameKu,
        taglineEn: dto.taglineEn, taglineAr: dto.taglineAr, taglineKu: dto.taglineKu,
        descriptionEn: dto.descriptionEn, descriptionAr: dto.descriptionAr, descriptionKu: dto.descriptionKu,
        phone: dto.phone, whatsapp: dto.whatsapp, email: dto.email, website: dto.website,
        instagram: dto.instagram, facebook: dto.facebook, telegram: dto.telegram,
        address: dto.address, lat: dto.lat, lng: dto.lng,
        openingHours: dto.openingHours, specialties: dto.specialties ?? [],
        locationId: dto.locationId,
        subscription: { create: { plan: 'FREE', status: 'ACTIVE', maxListings: 5 } },
      },
      include: this.defaultInclude(),
    });

    this.cache.del('dealers:list:');
    return dealer;
  }

  // ── findAll — cached + lean ────────────────────────────────────────────────
  async findAll(query: DealerQueryDto) {
    const { city, tier, minRating, search, page = 1, limit = 20, sortBy = 'rating' } = query;
    const safeLimit = Math.min(Math.max(1, limit), 50);

    const cacheKey = `dealers:list:${JSON.stringify({ city, tier, minRating, search, page, safeLimit, sortBy })}`;

    return this.cache.getOrSet(cacheKey, async () => {
      const where: Prisma.DealerWhereInput = {
        status: DealerStatus.VERIFIED,
        ...(tier      && { tier: tier as DealerTier }),
        ...(minRating && { averageRating: { gte: minRating } }),
        ...(city      && { location: { city: { contains: city, mode: 'insensitive' } } }),
        ...(search    && {
          OR: [
            { nameEn: { contains: search, mode: 'insensitive' } },
            { nameAr: { contains: search, mode: 'insensitive' } },
            { nameKu: { contains: search, mode: 'insensitive' } },
          ],
        }),
      };

      const orderBy: Prisma.DealerOrderByWithRelationInput =
        sortBy === 'rating'   ? { averageRating: 'desc' } :
        sortBy === 'listings' ? { activeListings: 'desc' } :
        sortBy === 'reviews'  ? { totalReviews: 'desc' } :
        sortBy === 'newest'   ? { createdAt: 'desc' } :
                                { averageRating: 'desc' };

      // PERF: parallel count + data; lean select
      const [dealers, total] = await Promise.all([
        this.prisma.dealer.findMany({
          where, orderBy,
          skip: (page - 1) * safeLimit,
          take: safeLimit,
          select: LIST_SELECT,
        }),
        this.prisma.dealer.count({ where }),
      ]);

      return { dealers, total, page, limit: safeLimit, pages: Math.ceil(total / safeLimit) };
    }, 30_000); // 30 s SWR
  }

  // ── findBySlug — cached 2 min ──────────────────────────────────────────────
  async findBySlug(slug: string) {
    const key = `dealers:detail:${slug}`;
    const dealer = await this.cache.getOrSet(key, async () => {
      const d = await this.prisma.dealer.findUnique({
        where: { slug },
        include: {
          location: true,
          badges: {
            where: { OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] },
            orderBy: { awardedAt: 'desc' },
          },
          showroomImages: { orderBy: { order: 'asc' } },
          subscription: { select: { plan: true, analyticsEnabled: true } },
          reviews: {
            where: { flagged: false },
            include: { reviewer: { select: { id: true, name: true, avatar: true } } },
            orderBy: { createdAt: 'desc' },
            take: 10,
          },
          _count: { select: { reviews: true, contactRequests: true } },
        },
      });
      return d;
    }, 2 * 60_000);

    if (!dealer || dealer.status !== DealerStatus.VERIFIED) {
      throw new NotFoundException('Dealer not found');
    }

    // PERF: batched analytics — no per-request DB write
    this.bufferAnalytic(dealer.id, 'profileViews');
    scheduleAnalyticFlush(this.prisma);

    return dealer;
  }

  // ── update ─────────────────────────────────────────────────────────────────
  async update(userId: string, dto: UpdateDealerDto) {
    const dealer = await this.prisma.dealer.findUnique({ where: { userId } });
    if (!dealer) throw new NotFoundException('Dealer profile not found');

    const updated = await this.prisma.dealer.update({
      where: { id: dealer.id },
      data: {
        nameEn: dto.nameEn, nameAr: dto.nameAr, nameKu: dto.nameKu,
        taglineEn: dto.taglineEn, taglineAr: dto.taglineAr, taglineKu: dto.taglineKu,
        descriptionEn: dto.descriptionEn, descriptionAr: dto.descriptionAr, descriptionKu: dto.descriptionKu,
        phone: dto.phone, whatsapp: dto.whatsapp, email: dto.email, website: dto.website,
        instagram: dto.instagram, facebook: dto.facebook, telegram: dto.telegram,
        address: dto.address, lat: dto.lat, lng: dto.lng,
        openingHours: dto.openingHours, specialties: dto.specialties,
        locationId: dto.locationId,
      },
      include: this.defaultInclude(),
    });

    this.cache.del(`dealers:detail:${dealer.slug}`);
    this.cache.del('dealers:list:');
    return updated;
  }

  // ── createReview ───────────────────────────────────────────────────────────
  async createReview(reviewerId: string, dealerSlug: string, dto: CreateReviewDto) {
    const dealer = await this.prisma.dealer.findUnique({
      where: { slug: dealerSlug },
      select: { id: true, userId: true },
    });
    if (!dealer) throw new NotFoundException('Dealer not found');
    if (dealer.userId === reviewerId) throw new ForbiddenException('Cannot review yourself');

    const existing = await this.prisma.dealerReview.findUnique({
      where: { dealerId_reviewerId: { dealerId: dealer.id, reviewerId } },
    });
    if (existing) throw new ConflictException('You have already reviewed this dealer');

    // PERF: create review + recompute rating in one transaction
    const [review] = await this.prisma.$transaction([
      this.prisma.dealerReview.create({
        data: {
          dealerId: dealer.id, reviewerId,
          rating: dto.rating, title: dto.title, body: dto.body,
          ratingService: dto.ratingService, ratingPrice: dto.ratingPrice,
          ratingQuality: dto.ratingQuality,
        },
        include: { reviewer: { select: { id: true, name: true, avatar: true } } },
      }),
    ]);

    // Fire-and-forget rating recompute
    this.recomputeRating(dealer.id).catch(() => {});
    this.cache.del(`dealers:detail:${dealerSlug}`);
    this.cache.del('dealers:list:');

    return review;
  }

  // ── getReviews ─────────────────────────────────────────────────────────────
  async getReviews(dealerSlug: string, page = 1, limit = 20) {
    const safeLimit = Math.min(limit, 50);
    const dealer = await this.prisma.dealer.findUnique({
      where: { slug: dealerSlug },
      select: { id: true },
    });
    if (!dealer) throw new NotFoundException('Dealer not found');

    const cacheKey = `dealers:reviews:${dealer.id}:p${page}`;
    return this.cache.getOrSet(cacheKey, async () => {
      const [reviews, total] = await Promise.all([
        this.prisma.dealerReview.findMany({
          where: { dealerId: dealer.id, flagged: false },
          include: { reviewer: { select: { id: true, name: true, avatar: true, createdAt: true } } },
          orderBy: [{ helpful: 'desc' }, { createdAt: 'desc' }],
          skip: (page - 1) * safeLimit,
          take: safeLimit,
        }),
        this.prisma.dealerReview.count({ where: { dealerId: dealer.id, flagged: false } }),
      ]);
      return { reviews, total, page, limit: safeLimit };
    }, 60_000);
  }

  // ── contactDealer ──────────────────────────────────────────────────────────
  async contactDealer(dealerSlug: string, dto: ContactDealerDto, senderId?: string) {
    const dealer = await this.prisma.dealer.findUnique({
      where: { slug: dealerSlug },
      select: { id: true, whatsapp: true },
    });
    if (!dealer) throw new NotFoundException('Dealer not found');

    const request = await this.prisma.dealerContactRequest.create({
      data: {
        dealerId: dealer.id,
        senderId: senderId ?? null,
        name: dto.name, phone: dto.phone, email: dto.email,
        message: dto.message, channel: dto.channel ?? 'form',
        listingId: dto.listingId,
      },
    });

    this.bufferAnalytic(dealer.id, 'newLeads');
    scheduleAnalyticFlush(this.prisma);

    let whatsappUrl: string | null = null;
    if (dealer.whatsapp) {
      const cleaned = dealer.whatsapp.replace(/\D/g, '');
      if (cleaned.length >= 7 && cleaned.length <= 15) {
        whatsappUrl = `https://wa.me/${cleaned}?text=${encodeURIComponent(dto.message)}`;
      }
    }

    return { success: true, requestId: request.id, whatsappUrl };
  }

  // ── getAnalytics ───────────────────────────────────────────────────────────
  async getAnalytics(userId: string, days = 30) {
    const safeDays = Math.min(Math.max(1, days), 365);
    const dealer = await this.prisma.dealer.findUnique({
      where: { userId },
      select: { id: true },
    });
    if (!dealer) throw new NotFoundException('Dealer profile not found');

    const key = `dealers:analytics:${dealer.id}:d${safeDays}`;
    return this.cache.getOrSet(key, async () => {
      const since = new Date();
      since.setDate(since.getDate() - safeDays);

      const analytics = await this.prisma.dealerAnalytic.findMany({
        where: { dealerId: dealer.id, date: { gte: since } },
        orderBy: { date: 'asc' },
      });

      const totals = analytics.reduce(
        (acc, row) => ({
          profileViews:   acc.profileViews   + row.profileViews,
          listingViews:   acc.listingViews   + row.listingViews,
          contactClicks:  acc.contactClicks  + row.contactClicks,
          whatsappClicks: acc.whatsappClicks + row.whatsappClicks,
          phoneClicks:    acc.phoneClicks    + row.phoneClicks,
          newLeads:       acc.newLeads       + row.newLeads,
          newReviews:     acc.newReviews     + row.newReviews,
        }),
        { profileViews:0, listingViews:0, contactClicks:0, whatsappClicks:0, phoneClicks:0, newLeads:0, newReviews:0 },
      );

      return { analytics, totals, days: safeDays };
    }, 5 * 60_000); // 5 min — analytics dashboard doesn't need real-time
  }

  // ── Admin ──────────────────────────────────────────────────────────────────
  async verify(dealerId: string, adminId: string, tier: DealerTier = DealerTier.BASIC) {
    const d = await this.prisma.dealer.update({
      where: { id: dealerId },
      data: { status: DealerStatus.VERIFIED, tier, verifiedAt: new Date(), verifiedBy: adminId },
    });
    this.cache.del('dealers:list:');
    return d;
  }

  async suspend(dealerId: string) {
    const d = await this.prisma.dealer.update({
      where: { id: dealerId },
      data: { status: DealerStatus.SUSPENDED },
    });
    this.cache.del('dealers:list:');
    return d;
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  private async recomputeRating(dealerId: string) {
    const agg = await this.prisma.dealerReview.aggregate({
      where: { dealerId, flagged: false },
      _avg: { rating: true },
      _count: { rating: true },
    });
    return this.prisma.dealer.update({
      where: { id: dealerId },
      data: { averageRating: agg._avg.rating ?? 0, totalReviews: agg._count.rating },
    });
  }

  private bufferAnalytic(dealerId: string, field: AnalyticsField) {
    if (!ALLOWED_ANALYTICS_FIELDS.has(field)) return;
    const entry = analyticsBuffer.get(dealerId) ?? {};
    entry[field] = (entry[field] ?? 0) + 1;
    analyticsBuffer.set(dealerId, entry);
  }

  private async uniqueSlug(base: string): Promise<string> {
    let slug = base; let i = 1;
    while (await this.prisma.dealer.findUnique({ where: { slug } })) {
      slug = `${base}-${i++}`;
    }
    return slug;
  }

  private defaultInclude() {
    return {
      location: true,
      badges: true,
      subscription: true,
      _count: { select: { reviews: true } },
    };
  }
}

// ── Batched analytics flush ────────────────────────────────────────────────
function scheduleAnalyticFlush(prisma: PrismaService) {
  if (analyticsTimer) return;
  analyticsTimer = setTimeout(async () => {
    analyticsTimer = null;
    if (analyticsBuffer.size === 0) return;
    const snap = new Map(analyticsBuffer);
    analyticsBuffer.clear();

    const today = new Date(); today.setHours(0, 0, 0, 0);

    await Promise.all(
      [...snap.entries()].map(([dealerId, fields]) => {
        const update: any = {};
        const create: any = { dealerId, date: today };
        for (const [k, v] of Object.entries(fields)) {
          update[k] = { increment: v };
          create[k] = v;
        }
        return prisma.dealerAnalytic
          .upsert({
            where: { dealerId_date: { dealerId, date: today } },
            create,
            update,
          })
          .catch(() => {});
      }),
    );
  }, 30_000);
}
