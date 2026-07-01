import { Injectable, BadRequestException, NotFoundException, Logger, Optional } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { AuditLogService, AuditAction } from '../../common/monitoring/audit-log.service';

// IMPROVE: Added input validation and error handling constants
const MAX_PAGE_LIMIT = 100;
const DEFAULT_PAGE_LIMIT = 20;
const MIN_PAGE = 1;

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    private prisma: PrismaService,
    @Optional() private notifications: NotificationsService,
    private auditLog: AuditLogService,
  ) {}

  // IMPROVE: Added validation for pagination inputs
  private validatePagination(page: number = 1, limit: number = DEFAULT_PAGE_LIMIT) {
    const validPage = Math.max(MIN_PAGE, Number(page) || MIN_PAGE);
    const validLimit = Math.min(MAX_PAGE_LIMIT, Math.max(1, Number(limit) || DEFAULT_PAGE_LIMIT));
    return { page: validPage, limit: validLimit };
  }

  async getDashboardStats() {
    try {
      const [
        totalUsers, totalListings, activeListings, totalReports, pendingListings,
        totalAds, featuredListings, totalDealers, pendingDealers, activeSubscriptions,
        revenueAgg, bannedUsers, suspendedUsers,
      ] =
        await Promise.all([
          this.prisma.user.count(),
          this.prisma.listing.count(),
          this.prisma.listing.count({ where: { status: 'ACTIVE' } }),
          this.prisma.report.count({ where: { status: 'PENDING' } }),
          this.prisma.listing.count({ where: { status: 'PENDING' } }),
          this.prisma.ad?.count() ?? Promise.resolve(0) as Promise<number>,
          this.prisma.listing.count({ where: { featured: true } }),
          this.prisma.dealer.count(),
          this.prisma.dealer.count({ where: { status: 'PENDING' } }),
          this.prisma.dealerSubscription.count({ where: { status: 'ACTIVE' } }),
          this.prisma.payment.aggregate({
            where: { status: 'COMPLETED' },
            _sum: { amount: true },
          }),
          this.prisma.user.count({ where: { banned: true } }),
          this.prisma.user.count({ where: { suspendedUntil: { gt: new Date() } } }),
        ]);
      return {
        totalUsers, totalListings, activeListings, totalReports, pendingListings,
        totalAds, featuredListings, totalDealers, pendingDealers, activeSubscriptions,
        totalRevenue: revenueAgg._sum?.amount ?? 0,
        bannedUsers, suspendedUsers,
      };
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
  async getAllUsers(page = 1, limit = DEFAULT_PAGE_LIMIT, search?: string, role?: string, status?: string) {
    const { page: validPage, limit: validLimit } = this.validatePagination(page, limit);
    const skip = (validPage - 1) * validLimit;

    // IMPROVE: Sanitize search input to prevent injection
    const sanitizedSearch = search?.trim().slice(0, 100) || undefined;

    const where: any = {};
    const conditions: any[] = [];
    if (sanitizedSearch) {
      conditions.push({
        OR: [
          { email: { contains: sanitizedSearch, mode: 'insensitive' as const } },
          { name: { contains: sanitizedSearch, mode: 'insensitive' as const } },
        ],
      });
    }
    if (role && ['USER', 'DEALER', 'ADMIN'].includes(role)) {
      conditions.push({ role });
    }
    if (status === 'BANNED') {
      conditions.push({ banned: true });
    } else if (status === 'SUSPENDED') {
      conditions.push({ banned: false }, { suspendedUntil: { gt: new Date() } });
    } else if (status === 'ACTIVE') {
      conditions.push(
        { banned: false },
        { OR: [{ suspendedUntil: null }, { suspendedUntil: { lte: new Date() } }] },
      );
    }
    if (conditions.length) where.AND = conditions;

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
            phone: true,
            role: true,
            verified: true,
            banned: true,
            suspendedUntil: true,
            suspendedReason: true,
            createdAt: true,
            _count: { select: { listings: true, reports: true } },
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

  // ── getUserDetail ──────────────────────────────────────────────────────────
  // Full profile for the admin user-detail drawer: account info, listings,
  // payments, and reports filed against them — i.e. "seller activity".
  async getUserDetail(id: string) {
    if (!id) throw new BadRequestException('User ID is required');

    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true, email: true, name: true, phone: true, role: true,
        verified: true, banned: true, suspendedUntil: true, suspendedReason: true,
        locale: true, createdAt: true, deletedAt: true,
        dealer: { select: { id: true, slug: true, nameEn: true, status: true, tier: true } },
        subscription: { select: { plan: true, status: true, currentPeriodEnd: true } },
      },
    });
    if (!user) throw new NotFoundException(`User ${id} not found`);

    const [listings, payments, reportsAgainst, reportsFiled] = await Promise.all([
      this.prisma.listing.findMany({
        where: { userId: id },
        orderBy: { createdAt: 'desc' },
        take: 20,
        select: { id: true, titleEn: true, titleKu: true, status: true, price: true, views: true, createdAt: true },
      }),
      this.prisma.payment.findMany({
        where: { userId: id },
        orderBy: { createdAt: 'desc' },
        take: 20,
        select: { id: true, plan: true, amount: true, currency: true, status: true, createdAt: true },
      }),
      this.prisma.report.count({ where: { targetType: 'USER', targetId: id } }),
      this.prisma.report.count({ where: { reporterId: id } }),
    ]);

    return { user, listings, payments, reportsAgainst, reportsFiled };
  }

  // IMPROVE: Added error handling and logging
  async banUser(id: string, banned: boolean, actorId?: string) {
    if (!id) throw new BadRequestException('User ID is required');

    try {
      const user = await this.prisma.user.update({
        where: { id },
        data: { banned: Boolean(banned) },
      });

      // Revoke any active sessions immediately when banning
      if (banned) {
        await this.prisma.refreshToken.deleteMany({ where: { userId: id } }).catch(() => {});
      }

      this.auditLog.log({
        action: banned ? AuditAction.ADMIN_USER_BANNED : AuditAction.ADMIN_USER_UNBANNED,
        actorId,
        targetId: id,
        targetType: 'User',
        after: { banned: Boolean(banned) },
      }).catch(() => {});

      return user;
    } catch (err: any) {
      if (err.code === 'P2025') {
        throw new NotFoundException(`User ${id} not found`);
      }
      this.logger.error(`Failed to ban user ${id}: ${err.message}`);
      throw err;
    }
  }

  // ── suspendUser ──────────────────────────────────────────────────────────
  // Temporary suspension, distinct from a permanent ban. Pass `until: null`
  // to lift a suspension early.
  async suspendUser(id: string, until: Date | null, reason: string | undefined, actorId?: string) {
    if (!id) throw new BadRequestException('User ID is required');
    if (until && until <= new Date()) {
      throw new BadRequestException('Suspension end date must be in the future');
    }

    try {
      const user = await this.prisma.user.update({
        where: { id },
        data: {
          suspendedUntil: until,
          suspendedReason: until ? (reason?.slice(0, 255) ?? null) : null,
        },
      });

      if (until) {
        await this.prisma.refreshToken.deleteMany({ where: { userId: id } }).catch(() => {});
      }

      this.auditLog.log({
        action: until ? AuditAction.ADMIN_USER_BANNED : AuditAction.ADMIN_USER_UNBANNED,
        actorId,
        targetId: id,
        targetType: 'User',
        metadata: { type: 'suspension', until: until?.toISOString() ?? null, reason },
      }).catch(() => {});

      return user;
    } catch (err: any) {
      if (err.code === 'P2025') {
        throw new NotFoundException(`User ${id} not found`);
      }
      this.logger.error(`Failed to suspend user ${id}: ${err.message}`);
      throw err;
    }
  }

  async setUserRole(id: string, role: 'USER' | 'DEALER' | 'ADMIN', actorId?: string) {
    const allowed: UserRole[] = [UserRole.USER, UserRole.DEALER, UserRole.ADMIN];
    if (!allowed.includes(role as UserRole)) {
      throw new BadRequestException(`Invalid role: ${role}`);
    }
    try {
      const user = await this.prisma.user.update({
        where: { id },
        data: { role: role as UserRole },
        select: { id: true, email: true, role: true },
      });

      this.auditLog.log({
        action: AuditAction.ADMIN_ROLE_CHANGED,
        actorId,
        targetId: id,
        targetType: 'User',
        after: { role },
      }).catch(() => {});

      return user;
    } catch (err: any) {
      if (err.code === 'P2025') throw new NotFoundException(`User ${id} not found`);
      this.logger.error(`setUserRole failed for ${id}: ${err.message}`);
      throw err;
    }
  }

  // IMPROVE: Added error handling
  // BUG #9 FIX: User.delete() previously hard-deleted, which Postgres rejects
  // with P2003 (foreign key violation) for almost any real account, since
  // Listing.user / Payment.user / Message.sender are all `onDelete: Restrict`.
  // Soft-delete + anonymize instead, matching the intent of `User.deletedAt`.
  async deleteUser(id: string) {
    if (!id) throw new BadRequestException('User ID is required');

    try {
      return await this.prisma.user.update({
        where: { id },
        data: {
          deletedAt: new Date(),
          email: `deleted_${id}@deleted.local`,
          password: null,
          banned: true,
        },
      });
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
    if (status && ['ACTIVE', 'PENDING', 'REJECTED', 'SOLD', 'EXPIRED', 'DRAFT', 'UNDER_REVIEW'].includes(status)) {
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
  async approveListing(id: string, actorId?: string) {
    if (!id) throw new BadRequestException('Listing ID is required');

    try {
      const listing = await this.prisma.listing.update({
        where: { id },
        data: { status: 'ACTIVE' },
        select: { id: true, userId: true, titleKu: true, titleAr: true, titleEn: true },
      });

      // Feature 8: Push notification to listing owner
      this.notifications.sendPush?.(listing.userId, {
        title:   'Listing Approved ✅',
        titleKu: 'ئۆگێری تۆمارەکەت ✅',
        titleAr: 'تمت الموافقة على إعلانك ✅',
        body:    listing.titleKu ?? listing.titleEn ?? 'Your listing is now live',
        bodyKu:  `${listing.titleKu ?? ''} — ئێستا بەردەستە`,
        bodyAr:  `${listing.titleAr ?? listing.titleKu ?? ''} — متاح الآن`,
        url:     `/ku/listings/${listing.id}`,
        tag:     `listing-status-${listing.id}`,
        data:    { listingId: listing.id, status: 'ACTIVE' },
      })?.catch(() => {});

      this.auditLog.log({
        action: AuditAction.LISTING_APPROVED,
        actorId,
        targetId: id,
        targetType: 'Listing',
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
  async rejectListing(id: string, actorId?: string) {
    if (!id) throw new BadRequestException('Listing ID is required');

    try {
      const listing = await this.prisma.listing.update({
        where: { id },
        data: { status: 'REJECTED' },
        select: { id: true, userId: true, titleKu: true, titleAr: true, titleEn: true },
      });

      // Feature 8: Push notification to listing owner
      this.notifications.sendPush?.(listing.userId, {
        title:   'Listing Rejected ❌',
        titleKu: 'ئۆگێری تۆمارەکەت رەتکرایەوە ❌',
        titleAr: 'تم رفض إعلانك ❌',
        body:    listing.titleKu ?? listing.titleEn ?? 'Your listing was not approved',
        bodyKu:  `${listing.titleKu ?? ''} — پەسەندنەکرا`,
        bodyAr:  `${listing.titleAr ?? listing.titleKu ?? ''} — لم تتم الموافقة`,
        url:     `/ku/dashboard/listings`,
        tag:     `listing-status-${listing.id}`,
        data:    { listingId: listing.id, status: 'REJECTED' },
      })?.catch(() => {});

      this.auditLog.log({
        action: AuditAction.LISTING_REJECTED,
        actorId,
        targetId: id,
        targetType: 'Listing',
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
  async deleteListing(id: string, actorId?: string) {
    if (!id) throw new BadRequestException('Listing ID is required');

    try {
      const listing = await this.prisma.listing.delete({ where: { id } });

      this.auditLog.log({
        action: AuditAction.LISTING_DELETED,
        actorId,
        targetId: id,
        targetType: 'Listing',
        before: { titleEn: listing.titleEn, userId: listing.userId },
      }).catch(() => {});

      return listing;
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

  // IMPROVE: Added pagination validation; supports status + target-type filters
  async getReports(page = 1, limit = DEFAULT_PAGE_LIMIT, status?: string, targetType?: string) {
    const { page: validPage, limit: validLimit } = this.validatePagination(page, limit);
    const skip = (validPage - 1) * validLimit;

    const where: any = {};
    where.status = status && ['PENDING', 'RESOLVED', 'DISMISSED'].includes(status) ? status : 'PENDING';
    if (targetType && ['LISTING', 'USER', 'DEALER', 'MESSAGE'].includes(targetType)) {
      where.targetType = targetType;
    }

    try {
      const [data, total] = await Promise.all([
        this.prisma.report.findMany({
          skip,
          take: validLimit,
          where,
          orderBy: { createdAt: 'desc' },
          include: {
            reporter: { select: { id: true, name: true, email: true } },
          },
        }),
        this.prisma.report.count({ where }),
      ]);

      // Best-effort enrichment of the reported entity's display label.
      // Report.targetId is polymorphic (no FK), so we resolve per-type.
      const listingIds = data.filter((r: any) => r.targetType === 'LISTING').map((r: any) => r.targetId);
      const userIds     = data.filter((r: any) => r.targetType === 'USER').map((r: any) => r.targetId);

      const [listings, users] = await Promise.all([
        listingIds.length
          ? this.prisma.listing.findMany({ where: { id: { in: listingIds } }, select: { id: true, titleEn: true, titleKu: true } })
          : Promise.resolve([]),
        userIds.length
          ? this.prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, name: true, email: true } })
          : Promise.resolve([]),
      ]);
      const listingMap = new Map(listings.map((l: any) => [l.id, l]));
      const userMap     = new Map(users.map((u: any) => [u.id, u]));

      const enriched = data.map((r: any) => ({
        ...r,
        target:
          r.targetType === 'LISTING' ? listingMap.get(r.targetId) ?? null :
          r.targetType === 'USER'    ? userMap.get(r.targetId) ?? null :
          null,
      }));

      return { data: enriched, total, page: validPage, limit: validLimit, totalPages: Math.ceil(total / validLimit) };
    } catch (err) {
      this.logger.error(`Failed to fetch reports: ${err instanceof Error ? err.message : 'unknown error'}`);
      throw err;
    }
  }

  // IMPROVE: Added validation for action parameter
  async resolveReport(id: string, action: 'RESOLVED' | 'DISMISSED', actorId?: string) {
    if (!id) throw new BadRequestException('Report ID is required');
    if (!['RESOLVED', 'DISMISSED'].includes(action)) {
      throw new BadRequestException('Invalid action');
    }

    try {
      const report = await this.prisma.report.update({
        where: { id },
        data: { status: action },
      });

      this.auditLog.log({
        action: AuditAction.ADMIN_REPORT_RESOLVED,
        actorId,
        targetId: id,
        targetType: 'Report',
        after: { status: action },
      }).catch(() => {});

      return report;
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
  // BUG FIX: `data.active` mapped to the real `isActive` column — Prisma has
  // no `active` field on Ad, so passing `data` straight through threw
  // "Unknown argument `active`" at runtime.
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

    const { active, ...rest } = data;
    const updateData: any = { ...rest };
    if (active !== undefined) updateData.isActive = active;

    try {
      return await this.prisma.ad.update({ where: { id }, data: updateData });
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


  // ── getAuditLogs ──────────────────────────────────────────────────────────
  // Returns paginated audit-log entries directly from the AuditLog table.
  // Called by GET /admin/audit-logs.

  async getAuditLogs(
    page     = 1,
    limit    = 50,
    action?:   string,
    severity?: string,
    from?:     Date,
    to?:       Date,
  ) {
    const { page: vp, limit: vl } = this.validatePagination(page, limit);
    const skip = (vp - 1) * vl;

    const where: Record<string, any> = {};
    if (action)   where['action']   = action;
    // NOTE: AuditLog has no `severity` column — the `severity` param is
    // accepted for forward-compat with the frontend filter UI but currently
    // ignored to avoid a Prisma "unknown argument" runtime error.
    if (from || to) {
      where['createdAt'] = {};
      if (from) where['createdAt']['gte'] = from;
      if (to)   where['createdAt']['lte'] = to;
    }

    try {
      const [data, total] = await Promise.all([
        this.prisma.auditLog.findMany({
          where,
          skip,
          take:    vl,
          orderBy: { createdAt: 'desc' },
        }),
        this.prisma.auditLog.count({ where }),
      ]);
      return { data, total, page: vp, limit: vl, pages: Math.ceil(total / vl) };
    } catch (err) {
      this.logger.error(`Failed to fetch audit logs: ${err instanceof Error ? err.message : 'unknown'}`);
      throw err;
    }
  }

  // ── Dealers (admin) ─────────────────────────────────────────────────────
  // The public DealersController already exposes PATCH /dealers/:id/verify
  // and /dealers/:id/suspend (admin-guarded). These admin.* methods add the
  // missing pieces: an admin-facing list across ALL statuses (the public
  // findAll only surfaces verified dealers), and a reject action for
  // pending applications.

  async getAllDealers(page = 1, limit = DEFAULT_PAGE_LIMIT, status?: string, search?: string) {
    const { page: validPage, limit: validLimit } = this.validatePagination(page, limit);
    const skip = (validPage - 1) * validLimit;

    const where: any = {};
    if (status && ['PENDING', 'VERIFIED', 'SUSPENDED', 'REJECTED'].includes(status)) {
      where.status = status;
    }
    const sanitizedSearch = search?.trim().slice(0, 100) || undefined;
    if (sanitizedSearch) {
      where.OR = [
        { nameEn: { contains: sanitizedSearch, mode: 'insensitive' } },
        { nameKu: { contains: sanitizedSearch, mode: 'insensitive' } },
        { slug:   { contains: sanitizedSearch, mode: 'insensitive' } },
      ];
    }

    try {
      const [data, total] = await Promise.all([
        this.prisma.dealer.findMany({
          where,
          skip,
          take: validLimit,
          orderBy: { createdAt: 'desc' },
          include: {
            user: { select: { id: true, name: true, email: true } },
            subscription: { select: { plan: true, status: true, currentPeriodEnd: true } },
            _count: { select: { showroomImages: true, reviews: true } },
          },
        }),
        this.prisma.dealer.count({ where }),
      ]);
      return { data, total, page: validPage, limit: validLimit, totalPages: Math.ceil(total / validLimit) };
    } catch (err) {
      this.logger.error(`Failed to fetch dealers: ${err instanceof Error ? err.message : 'unknown error'}`);
      throw err;
    }
  }

  async rejectDealer(id: string, actorId?: string) {
    if (!id) throw new BadRequestException('Dealer ID is required');

    try {
      const dealer = await this.prisma.dealer.update({
        where: { id },
        data: { status: 'REJECTED' },
      });

      this.auditLog.log({
        action: AuditAction.ADMIN_ROLE_CHANGED,
        actorId,
        targetId: id,
        targetType: 'Dealer',
        after: { status: 'REJECTED' },
      }).catch(() => {});

      return dealer;
    } catch (err: any) {
      if (err.code === 'P2025') {
        throw new NotFoundException(`Dealer ${id} not found`);
      }
      this.logger.error(`Failed to reject dealer ${id}: ${err.message}`);
      throw err;
    }
  }

  // ── Transactions (admin) ────────────────────────────────────────────────
  // Read-only view over Payment + its TransactionLog trail, for the
  // "view all transactions" requirement. Mutations (refunds, retries) stay
  // in the payments module — this is monitoring only.

  async getTransactions(
    page = 1,
    limit = DEFAULT_PAGE_LIMIT,
    status?: string,
    gateway?: string,
    search?: string,
  ) {
    const { page: validPage, limit: validLimit } = this.validatePagination(page, limit);
    const skip = (validPage - 1) * validLimit;

    const where: any = {};
    if (status && ['pending', 'completed', 'failed', 'refunded', 'cancelled'].includes(status)) {
      where.status = status;
    }
    if (gateway && ['stripe', 'zaincash', 'fastpay', 'qicard', 'asiahawala'].includes(gateway)) {
      where.gateway = gateway;
    }
    const sanitizedSearch = search?.trim().slice(0, 100) || undefined;
    if (sanitizedSearch) {
      where.user = {
        OR: [
          { email: { contains: sanitizedSearch, mode: 'insensitive' } },
          { name: { contains: sanitizedSearch, mode: 'insensitive' } },
        ],
      };
    }

    try {
      const [data, total, revenueAgg] = await Promise.all([
        this.prisma.payment.findMany({
          where,
          skip,
          take: validLimit,
          orderBy: { createdAt: 'desc' },
          include: {
            user: { select: { id: true, name: true, email: true } },
          },
        }),
        this.prisma.payment.count({ where }),
        this.prisma.payment.aggregate({ where: { ...where, status: 'completed' }, _sum: { amount: true } }),
      ]);
      return {
        data,
        total,
        page: validPage,
        limit: validLimit,
        totalPages: Math.ceil(total / validLimit),
        totalRevenue: revenueAgg._sum.amount ?? 0,
      };
    } catch (err) {
      this.logger.error(`Failed to fetch transactions: ${err instanceof Error ? err.message : 'unknown error'}`);
      throw err;
    }
  }

  async getTransactionDetail(id: string) {
    if (!id) throw new BadRequestException('Transaction ID is required');

    const payment = await this.prisma.payment.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, name: true, email: true } },
        transactionLogs: { orderBy: { createdAt: 'desc' } },
      },
    });
    if (!payment) throw new NotFoundException(`Transaction ${id} not found`);
    return payment;
  }

  // ── Subscriptions (admin) ───────────────────────────────────────────────
  // Combined view of per-user Subscription and per-dealer DealerSubscription
  // records, for the "view all subscriptions" / "manage premium dealers"
  // requirements.

  async getDealerSubscriptions(page = 1, limit = DEFAULT_PAGE_LIMIT, status?: string, plan?: string) {
    const { page: validPage, limit: validLimit } = this.validatePagination(page, limit);
    const skip = (validPage - 1) * validLimit;

    const where: any = {};
    if (status && ['ACTIVE', 'PAST_DUE', 'CANCELLED', 'TRIALING'].includes(status)) {
      where.status = status;
    }
    if (plan && ['FREE', 'STARTER', 'BUSINESS', 'ENTERPRISE'].includes(plan)) {
      where.plan = plan;
    }

    try {
      const [data, total] = await Promise.all([
        this.prisma.dealerSubscription.findMany({
          where,
          skip,
          take: validLimit,
          orderBy: { currentPeriodEnd: 'desc' },
          include: {
            dealer: {
              select: {
                id: true, slug: true, nameEn: true, status: true, tier: true,
                user: { select: { id: true, name: true, email: true } },
              },
            },
          },
        }),
        this.prisma.dealerSubscription.count({ where }),
      ]);
      return { data, total, page: validPage, limit: validLimit, totalPages: Math.ceil(total / validLimit) };
    } catch (err) {
      this.logger.error(`Failed to fetch dealer subscriptions: ${err instanceof Error ? err.message : 'unknown error'}`);
      throw err;
    }
  }

  async getUserSubscriptions(page = 1, limit = DEFAULT_PAGE_LIMIT, status?: string) {
    const { page: validPage, limit: validLimit } = this.validatePagination(page, limit);
    const skip = (validPage - 1) * validLimit;

    const where: any = {};
    if (status) where.status = status;

    try {
      const [data, total] = await Promise.all([
        this.prisma.subscription.findMany({
          where,
          skip,
          take: validLimit,
          orderBy: { currentPeriodEnd: 'desc' },
          include: { user: { select: { id: true, name: true, email: true, role: true } } },
        }),
        this.prisma.subscription.count({ where }),
      ]);
      return { data, total, page: validPage, limit: validLimit, totalPages: Math.ceil(total / validLimit) };
    } catch (err) {
      this.logger.error(`Failed to fetch subscriptions: ${err instanceof Error ? err.message : 'unknown error'}`);
      throw err;
    }
  }
}
