// apps/api/src/modules/dealers/dealers.service.ts

import { Injectable, NotFoundException, ForbiddenException, ConflictException } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { Prisma, DealerStatus, DealerTier } from '@prisma/client';
import { CreateDealerDto } from './dto/create-dealer.dto';
import { UpdateDealerDto } from './dto/update-dealer.dto';
import { CreateReviewDto } from './dto/create-review.dto';
import { DealerQueryDto } from './dto/dealer-query.dto';
import { ContactDealerDto } from './dto/contact-dealer.dto';
import slugify from 'slugify';

@Injectable()
export class DealersService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Create dealer profile ───────────────────────────────────────────────

  async create(userId: string, dto: CreateDealerDto) {
    const existing = await this.prisma.dealer.findUnique({ where: { userId } });
    if (existing) throw new ConflictException('Dealer profile already exists');

    const baseSlug = slugify(dto.nameEn, { lower: true, strict: true });
    const slug = await this.uniqueSlug(baseSlug);

    return this.prisma.dealer.create({
      data: {
        userId,
        slug,
        nameEn: dto.nameEn,
        nameAr: dto.nameAr,
        nameKu: dto.nameKu,
        taglineEn: dto.taglineEn,
        taglineAr: dto.taglineAr,
        taglineKu: dto.taglineKu,
        descriptionEn: dto.descriptionEn,
        descriptionAr: dto.descriptionAr,
        descriptionKu: dto.descriptionKu,
        phone: dto.phone,
        whatsapp: dto.whatsapp,
        email: dto.email,
        website: dto.website,
        instagram: dto.instagram,
        facebook: dto.facebook,
        telegram: dto.telegram,
        address: dto.address,
        lat: dto.lat,
        lng: dto.lng,
        openingHours: dto.openingHours,
        specialties: dto.specialties ?? [],
        locationId: dto.locationId,
        subscription: {
          create: { plan: 'FREE', status: 'ACTIVE', maxListings: 5 },
        },
      },
      include: this.defaultInclude(),
    });
  }

  // ── List dealers (marketplace) ─────────────────────────────────────────

  async findAll(query: DealerQueryDto) {
    const {
      city, tier, minRating, search,
      page = 1, limit = 20,
      sortBy = 'rating',
    } = query;

    const where: Prisma.DealerWhereInput = {
      status: DealerStatus.VERIFIED,
      ...(tier && { tier: tier as DealerTier }),
      ...(minRating && { averageRating: { gte: minRating } }),
      ...(city && { location: { city: { contains: city, mode: 'insensitive' } } }),
      ...(search && {
        OR: [
          { nameEn: { contains: search, mode: 'insensitive' } },
          { nameAr: { contains: search, mode: 'insensitive' } },
          { nameKu: { contains: search, mode: 'insensitive' } },
          { taglineEn: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };

    const orderBy: Prisma.DealerOrderByWithRelationInput =
      sortBy === 'rating'    ? { averageRating: 'desc' } :
      sortBy === 'listings'  ? { activeListings: 'desc' } :
      sortBy === 'reviews'   ? { totalReviews: 'desc' } :
      sortBy === 'newest'    ? { createdAt: 'desc' } :
                               { averageRating: 'desc' };

    const [dealers, total] = await Promise.all([
      this.prisma.dealer.findMany({
        where,
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
        include: {
          location: true,
          badges: { where: { OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] } },
          subscription: { select: { plan: true } },
          _count: { select: { reviews: true } },
        },
      }),
      this.prisma.dealer.count({ where }),
    ]);

    return { dealers, total, page, limit, pages: Math.ceil(total / limit) };
  }

  // ── Get dealer by slug (public showroom) ──────────────────────────────

  async findBySlug(slug: string) {
    const dealer = await this.prisma.dealer.findUnique({
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

    if (!dealer || dealer.status !== DealerStatus.VERIFIED) {
      throw new NotFoundException('Dealer not found');
    }

    // Track profile view (fire-and-forget)
    this.trackEvent(dealer.id, 'profileViews').catch(() => {});

    return dealer;
  }

  // ── Update dealer profile ──────────────────────────────────────────────

  async update(userId: string, dto: UpdateDealerDto) {
    const dealer = await this.prisma.dealer.findUnique({ where: { userId } });
    if (!dealer) throw new NotFoundException('Dealer profile not found');

    return this.prisma.dealer.update({
      where: { id: dealer.id },
      data: {
        nameEn: dto.nameEn,
        nameAr: dto.nameAr,
        nameKu: dto.nameKu,
        taglineEn: dto.taglineEn,
        taglineAr: dto.taglineAr,
        taglineKu: dto.taglineKu,
        descriptionEn: dto.descriptionEn,
        descriptionAr: dto.descriptionAr,
        descriptionKu: dto.descriptionKu,
        phone: dto.phone,
        whatsapp: dto.whatsapp,
        email: dto.email,
        website: dto.website,
        instagram: dto.instagram,
        facebook: dto.facebook,
        telegram: dto.telegram,
        address: dto.address,
        lat: dto.lat,
        lng: dto.lng,
        openingHours: dto.openingHours,
        specialties: dto.specialties,
        locationId: dto.locationId,
      },
      include: this.defaultInclude(),
    });
  }

  // ── Submit dealer review ───────────────────────────────────────────────

  async createReview(reviewerId: string, dealerSlug: string, dto: CreateReviewDto) {
    const dealer = await this.prisma.dealer.findUnique({ where: { slug: dealerSlug } });
    if (!dealer) throw new NotFoundException('Dealer not found');
    if (dealer.userId === reviewerId) throw new ForbiddenException('Cannot review yourself');

    const existing = await this.prisma.dealerReview.findUnique({
      where: { dealerId_reviewerId: { dealerId: dealer.id, reviewerId } },
    });
    if (existing) throw new ConflictException('You have already reviewed this dealer');

    const review = await this.prisma.dealerReview.create({
      data: {
        dealerId: dealer.id,
        reviewerId,
        rating: dto.rating,
        title: dto.title,
        body: dto.body,
        ratingService: dto.ratingService,
        ratingPrice: dto.ratingPrice,
        ratingQuality: dto.ratingQuality,
      },
      include: { reviewer: { select: { id: true, name: true, avatar: true } } },
    });

    // Recompute aggregated rating
    await this.recomputeRating(dealer.id);

    return review;
  }

  // ── Get dealer reviews (paginated) ────────────────────────────────────

  async getReviews(dealerSlug: string, page = 1, limit = 20) {
    const dealer = await this.prisma.dealer.findUnique({ where: { slug: dealerSlug }, select: { id: true } });
    if (!dealer) throw new NotFoundException('Dealer not found');

    const [reviews, total] = await Promise.all([
      this.prisma.dealerReview.findMany({
        where: { dealerId: dealer.id, flagged: false },
        include: { reviewer: { select: { id: true, name: true, avatar: true, createdAt: true } } },
        orderBy: [{ helpful: 'desc' }, { createdAt: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.dealerReview.count({ where: { dealerId: dealer.id, flagged: false } }),
    ]);

    return { reviews, total, page, limit };
  }

  // ── Contact form / WhatsApp lead capture ──────────────────────────────

  async contactDealer(dealerSlug: string, dto: ContactDealerDto, senderId?: string) {
    const dealer = await this.prisma.dealer.findUnique({ where: { slug: dealerSlug }, select: { id: true, whatsapp: true } });
    if (!dealer) throw new NotFoundException('Dealer not found');

    const request = await this.prisma.dealerContactRequest.create({
      data: {
        dealerId: dealer.id,
        senderId: senderId ?? null,
        name: dto.name,
        phone: dto.phone,
        email: dto.email,
        message: dto.message,
        channel: dto.channel ?? 'form',
        listingId: dto.listingId,
      },
    });

    // Track lead
    this.trackEvent(dealer.id, 'newLeads').catch(() => {});

    return {
      success: true,
      requestId: request.id,
      whatsappUrl: dealer.whatsapp
        ? `https://wa.me/${dealer.whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(dto.message)}`
        : null,
    };
  }

  // ── Dealer analytics (dashboard) ──────────────────────────────────────

  async getAnalytics(userId: string, days = 30) {
    const dealer = await this.prisma.dealer.findUnique({ where: { userId }, select: { id: true } });
    if (!dealer) throw new NotFoundException('Dealer profile not found');

    const since = new Date();
    since.setDate(since.getDate() - days);

    const analytics = await this.prisma.dealerAnalytic.findMany({
      where: { dealerId: dealer.id, date: { gte: since } },
      orderBy: { date: 'asc' },
    });

    // Aggregate totals
    const totals = analytics.reduce(
      (acc, row) => ({
        profileViews:     acc.profileViews     + row.profileViews,
        listingViews:     acc.listingViews     + row.listingViews,
        contactClicks:    acc.contactClicks    + row.contactClicks,
        whatsappClicks:   acc.whatsappClicks   + row.whatsappClicks,
        phoneClicks:      acc.phoneClicks      + row.phoneClicks,
        newLeads:         acc.newLeads         + row.newLeads,
        newReviews:       acc.newReviews       + row.newReviews,
      }),
      { profileViews: 0, listingViews: 0, contactClicks: 0, whatsappClicks: 0, phoneClicks: 0, newLeads: 0, newReviews: 0 },
    );

    return { analytics, totals, days };
  }

  // ── Admin: verify dealer ───────────────────────────────────────────────

  async verify(dealerId: string, adminId: string, tier: DealerTier = DealerTier.BASIC) {
    return this.prisma.dealer.update({
      where: { id: dealerId },
      data: {
        status: DealerStatus.VERIFIED,
        tier,
        verifiedAt: new Date(),
        verifiedBy: adminId,
      },
    });
  }

  // ── Admin: suspend dealer ──────────────────────────────────────────────

  async suspend(dealerId: string) {
    return this.prisma.dealer.update({
      where: { id: dealerId },
      data: { status: DealerStatus.SUSPENDED },
    });
  }

  // ── Private helpers ────────────────────────────────────────────────────

  private async recomputeRating(dealerId: string) {
    const agg = await this.prisma.dealerReview.aggregate({
      where: { dealerId, flagged: false },
      _avg: { rating: true },
      _count: { rating: true },
    });

    return this.prisma.dealer.update({
      where: { id: dealerId },
      data: {
        averageRating: agg._avg.rating ?? 0,
        totalReviews: agg._count.rating,
      },
    });
  }

  private async trackEvent(dealerId: string, field: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    await this.prisma.dealerAnalytic.upsert({
      where: { dealerId_date: { dealerId, date: today } },
      create: { dealerId, date: today, [field]: 1 },
      update: { [field]: { increment: 1 } },
    });
  }

  private async uniqueSlug(base: string): Promise<string> {
    let slug = base;
    let i = 1;
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
