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

// FIX: Whitelist of allowed analytics event field names — prevents prototype pollution
// from dynamic field injection into Prisma upsert
type AnalyticsField = 
  | 'profileViews' | 'listingViews' | 'contactClicks'
  | 'whatsappClicks' | 'phoneClicks' | 'newLeads' | 'newReviews';

const ALLOWED_ANALYTICS_FIELDS = new Set<AnalyticsField>([
  'profileViews', 'listingViews', 'contactClicks',
  'whatsappClicks', 'phoneClicks', 'newLeads', 'newReviews',
]);

@Injectable()
export class DealersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateDealerDto) {
    const existing = await this.prisma.dealer.findUnique({ where: { userId } });
    if (existing) throw new ConflictException('Dealer profile already exists');

    const baseSlug = slugify(dto.nameEn, { lower: true, strict: true });
    const slug = await this.uniqueSlug(baseSlug);

    return this.prisma.dealer.create({
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
  }

  async findAll(query: DealerQueryDto) {
    const { city, tier, minRating, search, page = 1, limit = 20, sortBy = 'rating' } = query;
    const safeLimit = Math.min(Math.max(1, limit), 50);

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
      sortBy === 'rating'   ? { averageRating: 'desc' } :
      sortBy === 'listings' ? { activeListings: 'desc' } :
      sortBy === 'reviews'  ? { totalReviews: 'desc' } :
      sortBy === 'newest'   ? { createdAt: 'desc' } :
                              { averageRating: 'desc' };

    const [dealers, total] = await Promise.all([
      this.prisma.dealer.findMany({
        where, orderBy,
        skip: (page - 1) * safeLimit,
        take: safeLimit,
        include: {
          location: true,
          badges: { where: { OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] } },
          subscription: { select: { plan: true } },
          _count: { select: { reviews: true } },
        },
      }),
      this.prisma.dealer.count({ where }),
    ]);

    return { dealers, total, page, limit: safeLimit, pages: Math.ceil(total / safeLimit) };
  }

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

    this.trackEvent(dealer.id, 'profileViews').catch(() => {});
    return dealer;
  }

  async update(userId: string, dto: UpdateDealerDto) {
    const dealer = await this.prisma.dealer.findUnique({ where: { userId } });
    if (!dealer) throw new NotFoundException('Dealer profile not found');

    return this.prisma.dealer.update({
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
  }

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
        dealerId: dealer.id, reviewerId,
        rating: dto.rating, title: dto.title, body: dto.body,
        ratingService: dto.ratingService, ratingPrice: dto.ratingPrice, ratingQuality: dto.ratingQuality,
      },
      include: { reviewer: { select: { id: true, name: true, avatar: true } } },
    });

    await this.recomputeRating(dealer.id);
    return review;
  }

  async getReviews(dealerSlug: string, page = 1, limit = 20) {
    const safeLimit = Math.min(limit, 50);
    const dealer = await this.prisma.dealer.findUnique({ where: { slug: dealerSlug }, select: { id: true } });
    if (!dealer) throw new NotFoundException('Dealer not found');

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
  }

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
        name: dto.name,
        phone: dto.phone,
        email: dto.email,
        message: dto.message,
        channel: dto.channel ?? 'form',
        listingId: dto.listingId,
      },
    });

    this.trackEvent(dealer.id, 'newLeads').catch(() => {});

    // FIX: Only expose whatsapp URL if whatsapp field is set; strip non-digit chars safely
    let whatsappUrl: string | null = null;
    if (dealer.whatsapp) {
      const cleaned = dealer.whatsapp.replace(/\D/g, '');
      if (cleaned.length >= 7 && cleaned.length <= 15) {
        whatsappUrl = `https://wa.me/${cleaned}?text=${encodeURIComponent(dto.message)}`;
      }
    }

    return { success: true, requestId: request.id, whatsappUrl };
  }

  async getAnalytics(userId: string, days = 30) {
    const safeDays = Math.min(Math.max(1, days), 365);
    const dealer = await this.prisma.dealer.findUnique({ where: { userId }, select: { id: true } });
    if (!dealer) throw new NotFoundException('Dealer profile not found');

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
      { profileViews: 0, listingViews: 0, contactClicks: 0, whatsappClicks: 0, phoneClicks: 0, newLeads: 0, newReviews: 0 },
    );

    return { analytics, totals, days: safeDays };
  }

  async verify(dealerId: string, adminId: string, tier: DealerTier = DealerTier.BASIC) {
    return this.prisma.dealer.update({
      where: { id: dealerId },
      data: { status: DealerStatus.VERIFIED, tier, verifiedAt: new Date(), verifiedBy: adminId },
    });
  }

  async suspend(dealerId: string) {
    return this.prisma.dealer.update({
      where: { id: dealerId },
      data: { status: DealerStatus.SUSPENDED },
    });
  }

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

  // FIX: Whitelist check prevents arbitrary field names being passed to Prisma
  private async trackEvent(dealerId: string, field: AnalyticsField) {
    if (!ALLOWED_ANALYTICS_FIELDS.has(field)) return; // hard guard

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
