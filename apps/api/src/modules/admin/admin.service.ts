import { Injectable, BadRequestException, NotFoundException, Logger, Optional } from '@nestjs/common';
import { UserRole, UserSubscriptionStatus } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { AuditLogService, AuditAction } from '../../common/monitoring/audit-log.service';
import { AuthService } from '../auth/auth.service';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import {
  SEARCH_INDEX_QUEUE,
  REINDEX_BATCH_SIZE,
  SearchIndexJobData,
} from '../search-indexing/search-index.constants';
import { computeRankingScore, CTR_WINDOW_DAYS } from '../../common/ranking/ranking-formula';
import { MetricsService } from '../../common/monitoring/metrics.service';

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
    // PROMPT 4 FIX: needed to call revokeTokensIssuedBefore() from
    // banUser/suspendUser/setUserRole below.
    private authService: AuthService,
    // Search Architecture Phase 1: same queue SearchIndexListener enqueues
    // onto in reaction to domain events — triggerSearchReindex() below is
    // just a bulk, admin-triggered producer of the same job shape.
    @InjectQueue(SEARCH_INDEX_QUEUE) private searchIndexQueue: Queue<SearchIndexJobData>,
    // Search Architecture Phase 5
    private readonly metrics: MetricsService,
  ) {}

  // IMPROVE: Added validation for pagination inputs
  private validatePagination(page: number = 1, limit: number = DEFAULT_PAGE_LIMIT) {
    const validPage = Math.max(MIN_PAGE, Number(page) || MIN_PAGE);
    const validLimit = Math.min(MAX_PAGE_LIMIT, Math.max(1, Number(limit) || DEFAULT_PAGE_LIMIT));
    return { page: validPage, limit: validLimit };
  }

  async getDashboardStats() {
    try {
      // F-PERF fix (Prompt 8): 13 independent counts/aggregates, no writes
      // anywhere in this method and nothing here needs to reflect a write
      // from earlier in the SAME request — same read-after-write reasoning
      // as listings.service.ts's browse-mode queries, not its findOne().
      const db = this.prisma.db('read');
      const [
        totalUsers, totalListings, activeListings, totalReports, pendingListings,
        totalAds, featuredListings, totalDealers, pendingDealers, activeSubscriptions,
        revenueAgg, bannedUsers, suspendedUsers,
      ] =
        await Promise.all([
          db.user.count(),
          db.listing.count(),
          db.listing.count({ where: { status: 'ACTIVE' } }),
          db.report.count({ where: { status: 'PENDING' } }),
          db.listing.count({ where: { status: 'PENDING' } }),
          db.ad?.count() ?? Promise.resolve(0) as Promise<number>,
          db.listing.count({ where: { featured: true } }),
          db.dealer.count(),
          db.dealer.count({ where: { status: 'PENDING' } }),
          db.dealerSubscription.count({ where: { status: 'ACTIVE' } }),
          db.payment.aggregate({
            where: { status: 'COMPLETED' },
            _sum: { amount: true },
          }),
          db.user.count({ where: { banned: true } }),
          db.user.count({ where: { suspendedUntil: { gt: new Date() } } }),
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

      // F-PERF fix (Prompt 8) — N+1 FLAGGED: this used to be
      // `months.map(async ({ year, month }) => { ...2 counts... })` inside a
      // Promise.all — 6 months x 2 counts = 12 separate queries per request
      // to this dashboard endpoint, where a single pair of range queries
      // does the same job. Prisma's groupBy() can't bucket by a truncated
      // date (only by literal column values), and hand-written raw SQL
      // here would need an exactly-cased quoted "User" table identifier
      // (no @@map on that model) — fragile for a 12-query-vs-2-query win
      // on what's already a single lightweight column. Instead: fetch just
      // `createdAt` for the whole 6-month window in ONE query per model,
      // then bucket by month in memory. Still 12 queries -> 2, without the
      // raw-SQL fragility, at the cost of transferring one timestamp
      // column per row in the window rather than doing the count fully in
      // Postgres — reasonable for a 6-month admin dashboard chart, revisit
      // if listing/user volume grows large enough to make that transfer
      // itself the bottleneck (at which point the raw SQL groupBy becomes
      // worth the fragility).
      const rangeStart = new Date(months[0].year, months[0].month - 1, 1);
      const rangeEnd = new Date(months[5].year, months[5].month, 1); // exclusive

      const db = this.prisma.db('read');
      const [listingRows, userRows] = await Promise.all([
        db.listing.findMany({
          where: { createdAt: { gte: rangeStart, lt: rangeEnd } },
          select: { createdAt: true },
        }),
        db.user.findMany({
          where: { createdAt: { gte: rangeStart, lt: rangeEnd } },
          select: { createdAt: true },
        }),
      ]);

      const bucketKey = (d: Date) => `${d.getFullYear()}-${d.getMonth() + 1}`;
      const countByMonth = (rows: { createdAt: Date }[]) => {
        const counts = new Map<string, number>();
        for (const { createdAt } of rows) {
          const k = bucketKey(createdAt);
          counts.set(k, (counts.get(k) ?? 0) + 1);
        }
        return counts;
      };
      const listingCounts = countByMonth(listingRows);
      const userCounts = countByMonth(userRows);

      const data = months.map(({ year, month, label }) => {
        const k = `${year}-${month}`;
        return {
          label,
          listings: listingCounts.get(k) ?? 0,
          users: userCounts.get(k) ?? 0,
        };
      });
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
      // F-PERF fix (Prompt 8): paginated list view, same replica-lag
      // trade-off already accepted for listings/search browse-mode.
      const db = this.prisma.db('read');
      const [data, total] = await Promise.all([
        db.user.findMany({
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
        db.user.count({ where }),
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
  //
  // F-PERF fix (Prompt 8) — FLAGGED, deliberately NOT routed to db('read'):
  // same reasoning as listings.service.ts findOne(). An admin very
  // plausibly opens this drawer immediately after banUser()/suspendUser()/
  // setUserRole() on the SAME user (separate request, but a tight
  // click-then-view admin workflow) — reading a lagging replica could show
  // the pre-ban state right after the ban action, which would look like the
  // action silently failed. Stays on the primary; the read-only sub-queries
  // below (listings/payments/reportsAgainst/reportsFiled) also aren't split
  // off to the replica, for the same reason — this whole drawer should be
  // one consistent, current snapshot.
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
        // PROMPT 4 FIX: refresh-token deletion alone doesn't stop a
        // currently-live access token (up to 15 min old) from still working —
        // this blocks it too.
        await this.authService.revokeTokensIssuedBefore(id).catch(() => {});
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
        // PROMPT 4 FIX: same reasoning as banUser above.
        await this.authService.revokeTokensIssuedBefore(id).catch(() => {});
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

      // PROMPT 4 FIX: setUserRole previously revoked nothing at all — a
      // currently-live access token kept the OLD role baked into its payload
      // for up to 15 more minutes (e.g. a demoted admin keeps admin-level
      // access until natural token expiry). Note refresh tokens are left
      // alone here (unlike ban/suspend) since refreshToken() always re-reads
      // the current role from the DB — only the *existing* access token
      // needs to be invalidated, not the session itself.
      await this.authService.revokeTokensIssuedBefore(id).catch(() => {});

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
      // F-PERF fix (Prompt 8): paginated moderation queue — same
      // browse-mode replica-lag trade-off as listings.service.ts.
      const db = this.prisma.db('read');
      const [data, total] = await Promise.all([
        db.listing.findMany({
          where: { status: 'PENDING' },
          skip,
          take: validLimit,
          orderBy: { createdAt: 'desc' },
          include: {
            user: { select: { id: true, name: true, email: true } },
            images: { where: { isCover: true }, take: 1 },
          },
        }),
        db.listing.count({ where: { status: 'PENDING' } }),
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
      // F-PERF fix (Prompt 8): paginated list view, same replica-lag
      // trade-off already accepted for listings/search browse-mode.
      const db = this.prisma.db('read');
      const [data, total] = await Promise.all([
        db.listing.findMany({
          skip,
          take: validLimit,
          where,
          orderBy: { createdAt: 'desc' },
          include: {
            user: { select: { id: true, name: true, email: true } },
            images: { where: { isCover: true }, take: 1 },
          },
        }),
        db.listing.count({ where }),
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
      // F-PERF fix (Prompt 8): read-only list view.
      return await this.prisma.db('read').listing.findMany({
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
      // F-PERF fix (Prompt 8): read-only moderation queue + its batched
      // enrichment queries below (already correctly batched, not N+1 —
      // just needed replica routing).
      const db = this.prisma.db('read');
      const [data, total] = await Promise.all([
        db.report.findMany({
          skip,
          take: validLimit,
          where,
          orderBy: { createdAt: 'desc' },
          include: {
            reporter: { select: { id: true, name: true, email: true } },
          },
        }),
        db.report.count({ where }),
      ]);

      // Best-effort enrichment of the reported entity's display label.
      // Report.targetId is polymorphic (no FK), so we resolve per-type.
      const listingIds = data.filter((r: any) => r.targetType === 'LISTING').map((r: any) => r.targetId);
      const userIds     = data.filter((r: any) => r.targetType === 'USER').map((r: any) => r.targetId);

      const [listings, users] = await Promise.all([
        listingIds.length
          ? db.listing.findMany({ where: { id: { in: listingIds } }, select: { id: true, titleEn: true, titleKu: true } })
          : Promise.resolve([]),
        userIds.length
          ? db.user.findMany({ where: { id: { in: userIds } }, select: { id: true, name: true, email: true } })
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
      // F-PERF fix (Prompt 8): read-only list view.
      return await this.prisma.db('read').category.findMany({
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
      // F-PERF fix (Prompt 8): read-only list view.
      return await this.prisma.db('read').translation.findMany({
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
      // F-PERF fix (Prompt 8): read-only list view.
      const db = this.prisma.db('read');
      const [data, total] = await Promise.all([
        db.ad.findMany({ skip, take: validLimit, orderBy: { createdAt: 'desc' } }),
        db.ad.count(),
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
      // F-PERF fix (Prompt 8): read-only list view.
      return await this.prisma.db('read').setting.findMany({ orderBy: { key: 'asc' } });
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
      // F-PERF fix (Prompt 8): read-only list view — consistent with the
      // other paginated admin list views above. (Considered keeping this
      // one on the primary, since audit logs are written by nearly every
      // other write method in this file and an admin might check this page
      // right after taking an action — but that's the same "list view
      // after a related write" situation as getAllListings after
      // approveListing, which we treat as an acceptable replica-lag
      // trade-off elsewhere in this file. Flagging the judgment call: move
      // this back to `this.prisma` directly if audit-log review is
      // compliance-sensitive enough that even a few seconds of lag matters.)
      const db = this.prisma.db('read');
      const [data, total] = await Promise.all([
        db.auditLog.findMany({
          where,
          skip,
          take:    vl,
          orderBy: { createdAt: 'desc' },
        }),
        db.auditLog.count({ where }),
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
      // F-PERF fix (Prompt 8): read-only list view.
      const db = this.prisma.db('read');
      const [data, total] = await Promise.all([
        db.dealer.findMany({
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
        db.dealer.count({ where }),
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
      // F-PERF fix (Prompt 8): read-only list + aggregate view.
      const db = this.prisma.db('read');
      const [data, total, revenueAgg] = await Promise.all([
        db.payment.findMany({
          where,
          skip,
          take: validLimit,
          orderBy: { createdAt: 'desc' },
          include: {
            user: { select: { id: true, name: true, email: true } },
          },
        }),
        db.payment.count({ where }),
        db.payment.aggregate({ where: { ...where, status: 'completed' }, _sum: { amount: true } }),
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

  // F-PERF fix (Prompt 8) — FLAGGED, deliberately NOT routed to db('read'):
  // same reasoning as getUserDetail() above / listings.service.ts findOne()
  // — single-record detail view for a transaction an admin may have just
  // resolved/refunded, where stale replica data would look like the action
  // silently failed.
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
      // F-PERF fix (Prompt 8): read-only list view.
      const db = this.prisma.db('read');
      const [data, total] = await Promise.all([
        db.dealerSubscription.findMany({
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
        db.dealerSubscription.count({ where }),
      ]);
      return { data, total, page: validPage, limit: validLimit, totalPages: Math.ceil(total / validLimit) };
    } catch (err) {
      this.logger.error(`Failed to fetch dealer subscriptions: ${err instanceof Error ? err.message : 'unknown error'}`);
      throw err;
    }
  }

  async getUserSubscriptions(page = 1, limit = DEFAULT_PAGE_LIMIT, status?: UserSubscriptionStatus) {
    const { page: validPage, limit: validLimit } = this.validatePagination(page, limit);
    const skip = (validPage - 1) * validLimit;

    const where: any = {};
    if (status) where.status = status;

    try {
      // F-PERF fix (Prompt 8): read-only list view.
      const db = this.prisma.db('read');
      const [data, total] = await Promise.all([
        db.subscription.findMany({
          where,
          skip,
          take: validLimit,
          orderBy: { currentPeriodEnd: 'desc' },
          include: { user: { select: { id: true, name: true, email: true, role: true } } },
        }),
        db.subscription.count({ where }),
      ]);
      return { data, total, page: validPage, limit: validLimit, totalPages: Math.ceil(total / validLimit) };
    } catch (err) {
      this.logger.error(`Failed to fetch subscriptions: ${err instanceof Error ? err.message : 'unknown error'}`);
      throw err;
    }
  }

  // ── Search Architecture Phase 1: full re-index ────────────────────────────
  //
  // Backfills Meilisearch with every currently-ACTIVE, non-deleted listing.
  // This is how the search index is populated for the first time, and how
  // it's repaired if it ever drifts from Postgres (Phase 5 adds an
  // automated drift-detection job; this endpoint is the manual escape
  // hatch for right now).
  //
  // Paginates in batches of REINDEX_BATCH_SIZE rather than loading every
  // listing into memory at once — same reasoning as every other read-only
  // admin list method in this file, just applied at a larger scale since
  // this walks the ENTIRE active listing set, not one page of it.
  //
  // Returns immediately once every batch has been enqueued — indexing
  // itself happens asynchronously in apps/worker's search-index.processor.ts,
  // so this call does not wait for the reindex to actually complete.
  async triggerSearchReindex(actorId?: string): Promise<{ queued: number }> {
    let cursor: string | undefined;
    let queued = 0;
    // Search Architecture Phase 5: see metrics.service.ts's
    // searchReindexDuration comment — this times the ENQUEUE loop only,
    // not full indexing completion (which happens async in the worker).
    const stopTimer = this.metrics.searchReindexDuration.startTimer();

    try {
      // F-PERF fix: read replica — this is a pure read walk over the
      // dataset, same reasoning as getFeaturedListings()/getDashboardStats().
      const db = this.prisma.db('read');

      // eslint-disable-next-line no-constant-condition
      while (true) {
        const batch: { id: string }[] = await db.listing.findMany({
          where: { status: 'ACTIVE', deletedAt: null },
          select: { id: true },
          orderBy: { id: 'asc' },
          take: REINDEX_BATCH_SIZE,
          ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
        });

        if (batch.length === 0) break;

        await this.searchIndexQueue.addBulk(
          batch.map((listing) => ({
            name: 'upsert',
            data: { action: 'upsert', listingId: listing.id } as SearchIndexJobData,
            opts: {
              attempts: 5,
              backoff: { type: 'exponential', delay: 2_000 },
              removeOnComplete: true,
              removeOnFail: 1_000,
            },
          })),
        );

        queued += batch.length;
        cursor = batch[batch.length - 1].id;

        if (batch.length < REINDEX_BATCH_SIZE) break;
      }

      this.auditLog.log({
        action: AuditAction.ADMIN_SEARCH_REINDEX_TRIGGERED,
        actorId,
        targetType: 'SearchIndex',
        metadata: { queued },
      }).catch(() => {});

      this.logger.log(`Full search reindex: enqueued ${queued} listings`);
      stopTimer();
      return { queued };
    } catch (err) {
      stopTimer();
      this.logger.error(
        `Failed to trigger search reindex: ${err instanceof Error ? err.message : 'unknown error'}`,
      );
      throw err;
    }
  }

  // ── Ranking breakdown (Search Architecture Phase 4) ───────────────────────
  //
  // Backs GET /admin/listings/:id/ranking — lets support/ops answer "why is
  // this listing ranked where it is" complaints from dealers without
  // reading code. Read-only: computes the breakdown fresh from current
  // data but does NOT persist it (persisting only happens via the nightly
  // ranking-recompute.processor.ts job or the immediate on-index path in
  // search-index.processor.ts) — so calling this endpoint repeatedly can
  // never itself cause ranking drift.
  async getRankingBreakdown(listingId: string) {
    const listing = await this.prisma.listing.findUnique({
      where: { id: listingId },
      select: { id: true, createdAt: true, featured: true, featuredUntil: true, userId: true, rankingScore: true },
    });
    if (!listing) {
      throw new NotFoundException('Listing not found');
    }

    const dealer = await this.prisma.dealer.findUnique({
      where: { userId: listing.userId },
      select: { verifiedAt: true },
    });

    const since = new Date(Date.now() - CTR_WINDOW_DAYS * 86_400_000);
    const [impressions, clicks] = await Promise.all([
      this.prisma.searchEvent.count({
        where: { resultListingIds: { has: listing.id }, createdAt: { gte: since } },
      }),
      this.prisma.searchClick.count({
        where: { listingId: listing.id, createdAt: { gte: since } },
      }),
    ]);

    const breakdown = computeRankingScore({
      createdAt: listing.createdAt,
      featured: listing.featured,
      featuredUntil: listing.featuredUntil,
      dealerVerified: dealer?.verifiedAt != null,
      impressions,
      clicks,
    });

    return {
      listingId: listing.id,
      // The score currently stored/used by Meilisearch — may differ
      // slightly from `breakdown.finalScore` below if it hasn't been
      // recomputed since the last nightly run or on-index event.
      storedRankingScore: listing.rankingScore,
      // Freshly computed right now, from current inputs — what the score
      // WOULD be if recomputed this instant.
      ...breakdown,
      inputs: {
        ageDays: Math.floor((Date.now() - listing.createdAt.getTime()) / 86_400_000),
        featured: listing.featured,
        featuredUntil: listing.featuredUntil,
        dealerVerified: dealer?.verifiedAt != null,
        impressions,
        clicks,
        ctrWindowDays: CTR_WINDOW_DAYS,
      },
    };
  }
}
