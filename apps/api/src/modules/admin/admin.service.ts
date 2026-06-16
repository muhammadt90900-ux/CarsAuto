import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

// IMPROVE: Added input validation and error handling constants
const MAX_PAGE_LIMIT = 100;
const DEFAULT_PAGE_LIMIT = 20;
const MIN_PAGE = 1;

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
  ) {}

  // IMPROVE: Added validation for pagination inputs
  private validatePagination(page: number = 1, limit: number = DEFAULT_PAGE_LIMIT) {
    const validPage = Math.max(MIN_PAGE, Number(page) || MIN_PAGE);
    const validLimit = Math.min(MAX_PAGE_LIMIT, Math.max(1, Number(limit) || DEFAULT_PAGE_LIMIT));
    return { page: validPage, limit: validLimit };
  }

  async getDashboardStats() {
    try {
      const [totalUsers, totalListings, activeListings, totalReports, pendingListings, totalAds, featuredListings] =
        await Promise.all([
          this.prisma.user.count(),
          this.prisma.listing.count(),
          this.prisma.listing.count({ where: { status: 'ACTIVE' } }),
          this.prisma.report.count({ where: { status: 'pending' } }),
          this.prisma.listing.count({ where: { status: 'PENDING' } }),
          this.prisma.ad?.count() ?? Promise.resolve(0),
          this.prisma.listing.count({ where: { featured: true } }),
        ]);
      return { totalUsers, totalListings, activeListings, totalReports, pendingListings, totalAds, featuredListings };
    } catch (err) {
      this.logger.error(`Failed to fetch dashboard stats: ${err instanceof Error ? err.message : 'unknown error'}`);
      throw err;
    }
  }

  async getAnalyticsCharts() {
    try {
      const now = new Date();
      const months = Array.from({ length: 6 }, (_, i) => {
        const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
        return {
          year: d.getFullYear(),
          month: d.getMonth() + 1,
          label: d.toLocaleString('en', { month: 'short', year: '2-digit' }),
        };
      });

      const data = await Promise.all(
        months.map(async ({ year, month, label }) => {
          const start = new Date(year, month - 1, 1);
          const end = new Date(year, month, 1);
          const [listings, users] = await Promise.all([
            this.prisma.listing.count({ where: { createdAt: { gte: start, lt: end } } }),
            this.prisma.user.count({ where: { createdAt: { gte: start, lt: end } } }),
          ]);
          return { label, listings, users };
        }),
      );
      return data;
    } catch (err) {
      this.logger.error(`Failed to fetch analytics: ${err instanceof Error ? err.message : 'unknown error'}`);
      throw err;
    }
  }

  // IMPROVE: Added pagination validation
  async getAllUsers(page = 1, limit = DEFAULT_PAGE_LIMIT, search?: string) {
    const { page: validPage, limit: validLimit } = this.validatePagination(page, limit);
    const skip = (validPage - 1) * validLimit;
    
    // IMPROVE: Sanitize search input to prevent injection
    const sanitizedSearch = search?.trim().slice(0, 100) || undefined;
    
    const where = sanitizedSearch
      ? {
          OR: [
            { email: { contains: sanitizedSearch, mode: 'insensitive' as const } },
            { name: { contains: sanitizedSearch, mode: 'insensitive' as const } },
          ],
        }
      : {};

    try {
      const [data, total] = await Promise.all([
        this.prisma.user.findMany({
          skip,
          take: validLimit,
          where,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            verified: true,
            createdAt: true,
          },
        }),
        this.prisma.user.count({ where }),
      ]);
      return { data, total, page: validPage, limit: validLimit, totalPages: Math.ceil(total / validLimit) };
    } catch (err) {
      this.logger.error(`Failed to fetch users: ${err instanceof Error ? err.message : 'unknown error'}`);
      throw err;
    }
  }

  // IMPROVE: Added error handling and logging
  async banUser(id: string, banned: boolean) {
    if (!id) throw new BadRequestException('User ID is required');
    
    try {
      return await this.prisma.user.update({
        where: { id },
        data: { banned: Boolean(banned) },
      });
    } catch (err: any) {
      if (err.code === 'P2025') {
        throw new NotFoundException(`User ${id} not found`);
      }
      this.logger.error(`Failed to ban user ${id}: ${err.message}`);
      throw err;
    }
  }

  // IMPROVE: Added error handling
  async deleteUser(id: string) {
    if (!id) throw new BadRequestException('User ID is required');
    
    try {
      return await this.prisma.user.delete({ where: { id } });
    } catch (err: any) {
      if (err.code === 'P2025') {
        throw new NotFoundException(`User ${id} not found`);
      }
      this.logger.error(`Failed to delete user ${id}: ${err.message}`);
      throw err;
    }
  }

  // IMPROVE: Added pagination validation
  async getPendingListings(page = 1, limit = DEFAULT_PAGE_LIMIT) {
    const { page: validPage, limit: validLimit } = this.validatePagination(page, limit);
    const skip = (validPage - 1) * validLimit;

    try {
      const [data, total] = await Promise.all([
        this.prisma.listing.findMany({
          where: { status: 'PENDING' },
          skip,
          take: validLimit,
          orderBy: { createdAt: 'desc' },
          include: {
            user: { select: { id: true, name: true, email: true } },
            images: { where: { isCover: true }, take: 1 },
          },
        }),
        this.prisma.listing.count({ where: { status: 'PENDING' } }),
      ]);
      return { data, total, page: validPage, limit: validLimit, totalPages: Math.ceil(total / validLimit) };
    } catch (err) {
      this.logger.error(`Failed to fetch pending listings: ${err instanceof Error ? err.message : 'unknown error'}`);
      throw err;
    }
  }

  // IMPROVE: Added pagination validation and search sanitization
  async getAllListings(page = 1, limit = DEFAULT_PAGE_LIMIT, status?: string, search?: string) {
    const { page: validPage, limit: validLimit } = this.validatePagination(page, limit);
    const skip = (validPage - 1) * validLimit;
    
    const where: any = {};
    if (status && ['ACTIVE', 'PENDING', 'REJECTED', 'ARCHIVED'].includes(status)) {
      where.status = status;
    }
    
    // IMPROVE: Sanitize search input
    const sanitizedSearch = search?.trim().slice(0, 100) || undefined;
    if (sanitizedSearch) {
      where.OR = [
        { titleEn: { contains: sanitizedSearch, mode: 'insensitive' } },
        { titleKu: { contains: sanitizedSearch, mode: 'insensitive' } },
        { titleAr: { contains: sanitizedSearch, mode: 'insensitive' } },
      ];
    }

    try {
      const [data, total] = await Promise.all([
        this.prisma.listing.findMany({
          skip,
          take: validLimit,
          where,
          orderBy: { createdAt: 'desc' },
          include: {
            user: { select: { id: true, name: true, email: true } },
            images: { where: { isCover: true }, take: 1 },
          },
        }),
        this.prisma.listing.count({ where }),
      ]);
      return { data, total, page: validPage, limit: validLimit, totalPages: Math.ceil(total / validLimit) };
    } catch (err) {
      this.logger.error(`Failed to fetch listings: ${err instanceof Error ? err.message : 'unknown error'}`);
      throw err;
    }
  }

  // IMPROVE: Added error handling
  async approveListing(id: string) {
    if (!id) throw new BadRequestException('Listing ID is required');

    try {
      const listing = await this.prisma.listing.update({
        where: { id },
        data: { status: 'ACTIVE' },
        select: { id: true, userId: true, titleKu: true, titleAr: true, titleEn: true },
      });

      // Feature 8: Push notification to listing owner
      this.notifications.sendPush(listing.userId, {
        title:   'Listing Approved ✅',
        titleKu: 'ئۆگێری تۆمارەکەت ✅',
        titleAr: 'تمت الموافقة على إعلانك ✅',
        body:    listing.titleKu ?? listing.titleEn ?? 'Your listing is now live',
        bodyKu:  `${listing.titleKu ?? ''} — ئێستا بەردەستە`,
        bodyAr:  `${listing.titleAr ?? listing.titleKu ?? ''} — متاح الآن`,
        url:     `/ku/listings/${listing.id}`,
        tag:     `listing-status-${listing.id}`,
        data:    { listingId: listing.id, status: 'ACTIVE' },
      }).catch(() => {});

      return listing;
    } catch (err: any) {
      if (err.code === 'P2025') {
        throw new NotFoundException(`Listing ${id} not found`);
      }
      this.logger.error(`Failed to approve listing ${id}: ${err.message}`);
      throw err;
    }
  }

  // IMPROVE: Added error handling
  async rejectListing(id: string) {
    if (!id) throw new BadRequestException('Listing ID is required');

    try {
      const listing = await this.prisma.listing.update({
        where: { id },
        data: { status: 'REJECTED' },
        select: { id: true, userId: true, titleKu: true, titleAr: true, titleEn: true },
      });

      // Feature 8: Push notification to listing owner
      this.notifications.sendPush(listing.userId, {
        title:   'Listing Rejected ❌',
        titleKu: 'ئۆگێری تۆمارەکەت رەتکرایەوە ❌',
        titleAr: 'تم رفض إعلانك ❌',
        body:    listing.titleKu ?? listing.titleEn ?? 'Your listing was not approved',
        bodyKu:  `${listing.titleKu ?? ''} — پەسەندنەکرا`,
        bodyAr:  `${listing.titleAr ?? listing.titleKu ?? ''} — لم تتم الموافقة`,
        url:     `/ku/dashboard/listings`,
        tag:     `listing-status-${listing.id}`,
        data:    { listingId: listing.id, status: 'REJECTED' },
      }).catch(() => {});

      return listing;
    } catch (err: any) {
      if (err.code === 'P2025') {
        throw new NotFoundException(`Listing ${id} not found`);
      }
      this.logger.error(`Failed to reject listing ${id}: ${err.message}`);
      throw err;
    }
  }

  // IMPROVE: Added error handling
  async deleteListing(id: string) {
    if (!id) throw new BadRequestException('Listing ID is required');
    
    try {
      return await this.prisma.listing.delete({ where: { id } });
    } catch (err: any) {
      if (err.code === 'P2025') {
        throw new NotFoundException(`Listing ${id} not found`);
      }
      this.logger.error(`Failed to delete listing ${id}: ${err.message}`);
      throw err;
    }
  }

  async getFeaturedListings() {
    try {
      return await this.prisma.listing.findMany({
        where: { featured: true },
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, name: true, email: true } },
          images: { where: { isCover: true }, take: 1 },
        },
      });
    } catch (err) {
      this.logger.error(`Failed to fetch featured listings: ${err instanceof Error ? err.message : 'unknown error'}`);
      throw err;
    }
  }

  // IMPROVE: Added error handling
  async setFeatured(id: string, featured: boolean, featuredUntil?: Date) {
    if (!id) throw new BadRequestException('Listing ID is required');
    
    try {
      return await this.prisma.listing.update({
        where: { id },
        data: { featured: Boolean(featured), featuredUntil: featuredUntil ?? null },
      });
    } catch (err: any) {
      if (err.code === 'P2025') {
        throw new NotFoundException(`Listing ${id} not found`);
      }
      this.logger.error(`Failed to set featured on listing ${id}: ${err.message}`);
      throw err;
    }
  }

  // IMPROVE: Added pagination validation
  async getReports(page = 1, limit = DEFAULT_PAGE_LIMIT) {
    const { page: validPage, limit: validLimit } = this.validatePagination(page, limit);
    const skip = (validPage - 1) * validLimit;

    try {
      const [data, total] = await Promise.all([
        this.prisma.report.findMany({
          skip,
          take: validLimit,
          where: { status: 'pending' },
          orderBy: { createdAt: 'desc' },
          include: {
            reporter: { select: { id: true, name: true, email: true } },
          },
        }),
        this.prisma.report.count({ where: { status: 'pending' } }),
      ]);
      return { data, total, page: validPage, limit: validLimit, totalPages: Math.ceil(total / validLimit) };
    } catch (err) {
      this.logger.error(`Failed to fetch reports: ${err instanceof Error ? err.message : 'unknown error'}`);
      throw err;
    }
  }

  // IMPROVE: Added validation for action parameter
  async resolveReport(id: string, action: 'resolved' | 'dismissed') {
    if (!id) throw new BadRequestException('Report ID is required');
    if (!['resolved', 'dismissed'].includes(action)) {
      throw new BadRequestException('Invalid action');
    }

    try {
      return await this.prisma.report.update({
        where: { id },
        data: { status: action },
      });
    } catch (err: any) {
      if (err.code === 'P2025') {
        throw new NotFoundException(`Report ${id} not found`);
      }
      this.logger.error(`Failed to resolve report ${id}: ${err.message}`);
      throw err;
    }
  }

  // IMPROVE: Added error handling
  async getCategories() {
    try {
      return await this.prisma.category.findMany({
        orderBy: { nameEn: 'asc' },
        include: { _count: { select: { listings: true } } },
      });
    } catch (err) {
      this.logger.error(`Failed to fetch categories: ${err instanceof Error ? err.message : 'unknown error'}`);
      throw err;
    }
  }

  // IMPROVE: Added input validation
  async createCategory(data: {
    nameEn: string;
    nameKu: string;
    nameAr: string;
    nameZh: string;
    slug: string;
    icon?: string;
    parentId?: string;
  }) {
    if (!data.nameEn || !data.slug) {
      throw new BadRequestException('nameEn and slug are required');
    }

    try {
      return await this.prisma.category.create({ data });
    } catch (err: any) {
      if (err.code === 'P2002') {
        throw new BadRequestException('Category slug already exists');
      }
      this.logger.error(`Failed to create category: ${err.message}`);
      throw err;
    }
  }

  // IMPROVE: Added input validation
  async updateCategory(
    id: string,
    data: { nameEn?: string; nameKu?: string; nameAr?: string; nameZh?: string; slug?: string; icon?: string },
  ) {
    if (!id) throw new BadRequestException('Category ID is required');

    try {
      return await this.prisma.category.update({ where: { id }, data });
    } catch (err: any) {
      if (err.code === 'P2025') {
        throw new NotFoundException(`Category ${id} not found`);
      }
      if (err.code === 'P2002') {
        throw new BadRequestException('Category slug already exists');
      }
      this.logger.error(`Failed to update category ${id}: ${err.message}`);
      throw err;
    }
  }

  // IMPROVE: Added error handling
  async deleteCategory(id: string) {
    if (!id) throw new BadRequestException('Category ID is required');

    try {
      return await this.prisma.category.delete({ where: { id } });
    } catch (err: any) {
      if (err.code === 'P2025') {
        throw new NotFoundException(`Category ${id} not found`);
      }
      this.logger.error(`Failed to delete category ${id}: ${err.message}`);
      throw err;
    }
  }

  // IMPROVE: Added input validation
  async getTranslations(locale?: string) {
    // IMPROVE: Validate locale format
    if (locale && !/^[a-z]{2}(-[A-Z]{2})?$/.test(locale)) {
      throw new BadRequestException('Invalid locale format');
    }

    const where = locale ? { locale } : {};
    try {
      return await this.prisma.translation.findMany({
        where,
        orderBy: [{ locale: 'asc' }, { namespace: 'asc' }, { key: 'asc' }],
      });
    } catch (err) {
      this.logger.error(`Failed to fetch translations: ${err instanceof Error ? err.message : 'unknown error'}`);
      throw err;
    }
  }

  // IMPROVE: Added input validation
  async upsertTranslation(locale: string, namespace: string, key: string, value: string) {
    if (!locale || !namespace || !key) {
      throw new BadRequestException('locale, namespace, and key are required');
    }

    try {
      return await this.prisma.translation.upsert({
        where: { locale_namespace_key: { locale, namespace, key } },
        update: { value },
        create: { locale, namespace, key, value },
      });
    } catch (err) {
      this.logger.error(`Failed to upsert translation: ${err instanceof Error ? err.message : 'unknown error'}`);
      throw err;
    }
  }

  // IMPROVE: Added error handling
  async deleteTranslation(id: string) {
    if (!id) throw new BadRequestException('Translation ID is required');

    try {
      return await this.prisma.translation.delete({ where: { id } });
    } catch (err: any) {
      if (err.code === 'P2025') {
        throw new NotFoundException(`Translation ${id} not found`);
      }
      this.logger.error(`Failed to delete translation ${id}: ${err.message}`);
      throw err;
    }
  }

  // IMPROVE: Added pagination validation
  async getAds(page = 1, limit = DEFAULT_PAGE_LIMIT) {
    const { page: validPage, limit: validLimit } = this.validatePagination(page, limit);
    const skip = (validPage - 1) * validLimit;

    try {
      const [data, total] = await Promise.all([
        this.prisma.ad.findMany({ skip, take: validLimit, orderBy: { createdAt: 'desc' } }),
        this.prisma.ad.count(),
      ]);
      return { data, total, page: validPage, limit: validLimit, totalPages: Math.ceil(total / validLimit) };
    } catch (err) {
      this.logger.error(`Failed to fetch ads: ${err instanceof Error ? err.message : 'unknown error'}`);
      throw err;
    }
  }

  // IMPROVE: Added input validation
  async createAd(data: {
    title: string;
    imageUrl: string;
    linkUrl: string;
    placement: string;
    startsAt?: Date;
    endsAt?: Date;
  }) {
    if (!data.title || !data.imageUrl || !data.linkUrl || !data.placement) {
      throw new BadRequestException('title, imageUrl, linkUrl, and placement are required');
    }

    try {
      return await this.prisma.ad.create({ data });
    } catch (err) {
      this.logger.error(`Failed to create ad: ${err instanceof Error ? err.message : 'unknown error'}`);
      throw err;
    }
  }

  // IMPROVE: Added error handling
  async updateAd(
    id: string,
    data: Partial<{
      title: string;
      imageUrl: string;
      linkUrl: string;
      placement: string;
      active: boolean;
      startsAt: Date;
      endsAt: Date;
    }>,
  ) {
    if (!id) throw new BadRequestException('Ad ID is required');

    try {
      return await this.prisma.ad.update({ where: { id }, data });
    } catch (err: any) {
      if (err.code === 'P2025') {
        throw new NotFoundException(`Ad ${id} not found`);
      }
      this.logger.error(`Failed to update ad ${id}: ${err.message}`);
      throw err;
    }
  }

  // IMPROVE: Added error handling
  async deleteAd(id: string) {
    if (!id) throw new BadRequestException('Ad ID is required');

    try {
      return await this.prisma.ad.delete({ where: { id } });
    } catch (err: any) {
      if (err.code === 'P2025') {
        throw new NotFoundException(`Ad ${id} not found`);
      }
      this.logger.error(`Failed to delete ad ${id}: ${err.message}`);
      throw err;
    }
  }

  async getSettings() {
    try {
      return await this.prisma.setting.findMany({ orderBy: { key: 'asc' } });
    } catch (err) {
      this.logger.error(`Failed to fetch settings: ${err instanceof Error ? err.message : 'unknown error'}`);
      throw err;
    }
  }

  // IMPROVE: Added input validation
  async upsertSetting(key: string, value: string) {
    if (!key) {
      throw new BadRequestException('key is required');
    }

    try {
      return await this.prisma.setting.upsert({
        where: { key },
        update: { value },
        create: { key, value },
      });
    } catch (err) {
      this.logger.error(`Failed to upsert setting: ${err instanceof Error ? err.message : 'unknown error'}`);
      throw err;
    }
  }
}
