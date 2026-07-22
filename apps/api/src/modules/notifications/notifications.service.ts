import { Injectable, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import * as webpush from 'web-push';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../common/prisma/prisma.service';

// Chunk size for bulk notification fan-out (createMany + queue.addBulk).
// 1000 keeps a single INSERT / Redis round-trip comfortably sized even for
// a dealer with a very large follower base.
const BULK_NOTIFICATION_CHUNK_SIZE = 1000;

export type NotificationType =
  | 'new_message'
  | 'listing_sold'
  | 'price_drop'
  | 'favorite_alert'
  | 'saved_search_alert'
  | 'offer_received'
  | 'offer_accepted'
  | 'offer_declined'
  | 'system'
  | 'SYSTEM'
  | 'LISTING_APPROVED'
  | 'LISTING_REJECTED'
  | 'DEALER_VERIFIED'
  | 'PAYMENT_RECEIVED'
  // ADDED (Trust & Safety Prompt 2)
  | 'IDENTITY_VERIFIED'
  | 'IDENTITY_REJECTED'
  // ADDED (Trust & Safety Prompt 5)
  | 'SUSPICIOUS_ACTIVITY_ALERT'
  // ADDED (Referral & Rewards System)
  | 'REFERRAL_QUALIFIED'
  | 'REFERRAL_REWARD_PREMIUM'
  | 'REFERRAL_BADGE_EARNED';

export interface PushNotificationPayload {
  title: string;
  titleKu?: string;
  titleAr?: string;
  body: string;
  bodyKu?: string;
  bodyAr?: string;
  icon?: string;
  badge?: string;
  url?: string;          // click action URL
  tag?: string;          // notification grouping
  data?: Record<string, unknown>;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private prisma: PrismaService,
    @InjectQueue('notifications') private notificationsQueue: Queue,
  ) {
    // Configure VAPID once on startup (keys come from env)
    if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
      webpush.setVapidDetails(
        `mailto:${process.env.VAPID_EMAIL ?? 'noreply@carsauto.iq'}`,
        process.env.VAPID_PUBLIC_KEY,
        process.env.VAPID_PRIVATE_KEY,
      );
    } else {
      this.logger.warn('VAPID keys not configured — push notifications disabled');
    }
  }

  // ---------------------------------------------------------------------------
  // Read / fetch
  // ---------------------------------------------------------------------------

  async getMyNotifications(userId: string) {
    return this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async getUnreadCount(userId: string): Promise<{ count: number }> {
    const count = await this.prisma.notification.count({ where: { userId, read: false } });
    return { count };
  }

  async getPreferences(userId: string) {
    return this.prisma.notificationPreference.upsert({
      where: { userId },
      create: { userId },
      update: {},
    });
  }

  // ---------------------------------------------------------------------------
  // Mark read / delete
  // ---------------------------------------------------------------------------

  async markOneRead(id: string, userId: string) {
    const notification = await this.prisma.notification.findUnique({ where: { id } });
    if (!notification) throw new NotFoundException('Notification not found');
    if (notification.userId !== userId) throw new ForbiddenException('Access denied');

    await this.prisma.notification.update({ where: { id }, data: { read: true } });
  }

  async markAllRead(userId: string) {
    await this.prisma.notification.updateMany({
      where: { userId, read: false },
      data: { read: true },
    });
  }

  async deleteOne(id: string, userId: string) {
    const notification = await this.prisma.notification.findUnique({ where: { id } });
    if (!notification) throw new NotFoundException('Notification not found');
    if (notification.userId !== userId) throw new ForbiddenException('Access denied');

    await this.prisma.notification.delete({ where: { id } });
  }

  // ---------------------------------------------------------------------------
  // Create & dispatch
  // ---------------------------------------------------------------------------

  /**
   * Core method: persist an in-app notification and schedule out-of-band
   * email + push delivery according to user preferences.
   */
  async create(
    userId: string,
    type: NotificationType,
    title: string,
    body: string,
    data?: Record<string, unknown>,
  ) {
    const notification = await this.prisma.notification.create({
      data: { userId, type, title, body, data: data as any },
    });

    // Queue email + push (fire & forget — no await)
    this.notificationsQueue
      .add('deliver', { notificationId: notification.id, userId, type, title, body, data })
      .catch((err) => this.logger.error('Failed to enqueue notification delivery', err));

    return notification;
  }

  /**
   * Bulk fan-out: send the SAME notification to many users at once.
   *
   * N+1 FIX (Phase 2 / Prompt 2.4): this replaces call sites that used to
   * loop over user ids and call `create()` once per user — one
   * `prisma.notification.create()` INSERT and one `queue.add()` Redis
   * round-trip per follower. For a dealer with thousands of followers that
   * was thousands of DB writes and thousands of Redis round-trips per new
   * listing.
   *
   * This method instead, per chunk of `BULK_NOTIFICATION_CHUNK_SIZE` users:
   *   1. Pre-generates the notification ids in-app (so we know them without
   *      a round-trip back to the DB — `createMany()` doesn't return rows).
   *   2. Issues ONE `prisma.notification.createMany()` for the whole chunk.
   *   3. Issues ONE `queue.addBulk()` for the whole chunk's delivery jobs —
   *      BullMQ's batched job-add API, a single Redis round-trip instead of
   *      one `.add()` await per user.
   */
  // ─────────────────────────────────────────────────────────────────────────
  // ADMIN BROADCAST NOTIFICATIONS
  // ADDED: backs the admin/notifications page. Was previously entirely
  // missing (no data model, no endpoint) — the page called GET
  // /admin/notifications and POST /admin/notifications/send, both 404.
  // "Sending" a broadcast resolves the target audience to a list of user
  // ids and reuses the existing createManyForUsers() fan-out (chunked
  // createMany + bulk queue enqueue) rather than duplicating that logic.
  // ─────────────────────────────────────────────────────────────────────────

  async adminListNotifications(params: { page?: number; limit?: number; status?: string }) {
    const page  = params.page  && params.page  > 0 ? params.page  : 1;
    const limit = params.limit && params.limit > 0 ? params.limit : 20;

    const where: Record<string, unknown> = {};
    if (params.status) where.status = params.status;

    const [data, total] = await Promise.all([
      this.prisma.adminNotification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: { createdBy: { select: { id: true, name: true, email: true } } },
      }),
      this.prisma.adminNotification.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  private async resolveAudienceUserIds(audience: 'ALL' | 'USERS' | 'DEALERS' | 'PREMIUM'): Promise<string[]> {
    if (audience === 'ALL') {
      const users = await this.prisma.user.findMany({ select: { id: true } });
      return users.map((u) => u.id);
    }
    if (audience === 'USERS') {
      const users = await this.prisma.user.findMany({ where: { role: 'USER' }, select: { id: true } });
      return users.map((u) => u.id);
    }
    if (audience === 'DEALERS') {
      const dealers = await this.prisma.dealer.findMany({ select: { userId: true } });
      return dealers.map((d) => d.userId);
    }
    // PREMIUM: dealers on GOLD or PLATINUM tier. Adjust here if "premium" is
    // later redefined (e.g. tied to an active DealerSubscription instead).
    const premiumDealers = await this.prisma.dealer.findMany({
      where: { tier: { in: ['GOLD', 'PLATINUM'] } },
      select: { userId: true },
    });
    return premiumDealers.map((d) => d.userId);
  }

  async adminSendNotification(
    adminUserId: string,
    dto: { title: string; body: string; type: string; audience: 'ALL' | 'USERS' | 'DEALERS' | 'PREMIUM' },
  ) {
    const campaign = await this.prisma.adminNotification.create({
      data: {
        title: dto.title,
        body: dto.body,
        type: dto.type as any,
        audience: dto.audience as any,
        status: 'DRAFT',
        createdById: adminUserId,
      },
    });

    try {
      const userIds = await this.resolveAudienceUserIds(dto.audience);
      await this.createManyForUsers(userIds, 'system', dto.title, dto.body, {
        adminNotificationId: campaign.id,
      });

      return this.prisma.adminNotification.update({
        where: { id: campaign.id },
        data: { status: 'SENT', sentCount: userIds.length, sentAt: new Date() },
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      this.logger.error(`Admin broadcast ${campaign.id} failed: ${msg}`);
      return this.prisma.adminNotification.update({
        where: { id: campaign.id },
        data: { status: 'FAILED', errorMessage: msg },
      });
    }
  }

  async createManyForUsers(
    userIds: string[],
    type: NotificationType,
    title: string,
    body: string,
    data?: Record<string, unknown>,
  ): Promise<void> {
    if (userIds.length === 0) return;

    for (let i = 0; i < userIds.length; i += BULK_NOTIFICATION_CHUNK_SIZE) {
      const chunk = userIds.slice(i, i + BULK_NOTIFICATION_CHUNK_SIZE);
      const rows = chunk.map((userId) => ({ id: randomUUID(), userId, type, title, body, data: data as any }));

      // 1 batched INSERT for the whole chunk instead of N individual creates.
      await this.prisma.notification.createMany({ data: rows });

      // 1 batched Redis round-trip for the whole chunk's delivery jobs
      // instead of N individual `queue.add()` awaits.
      try {
        await this.notificationsQueue.addBulk(
          rows.map((r) => ({
            name: 'deliver',
            data: { notificationId: r.id, userId: r.userId, type, title, body, data },
          })),
        );
      } catch (err) {
        this.logger.error('Failed to bulk-enqueue notification delivery', err as Error);
      }
    }
  }

  /**
   * Trigger favourite-item alerts for all users who saved this listing.
   */
  async triggerFavoriteAlerts(listingId: string, eventType: 'price_drop' | 'listing_sold') {
    const favorites = await this.prisma.favorite.findMany({
      where: { listingId },
      include: { listing: { select: { titleKu: true, price: true } } },
    });

    await Promise.all(
      favorites.map(async ({ userId, listing }: { userId: string; listing: any }) => {
        const prefs = await this.getPreferences(userId);
        if (!prefs.favoriteAlerts) return;

        const title =
          eventType === 'price_drop'
            ? `Price drop on "${listing.titleKu}"`
            : `"${listing.titleKu}" has been sold`;
        const body =
          eventType === 'price_drop'
            ? `New price: ${listing.price}`
            : 'This item you saved is no longer available.';

        await this.create(userId, 'favorite_alert', title, body, { listingId, eventType });
      }),
    );
  }

  /**
   * Trigger saved-search alerts when a new listing matches a user's search.
   */
  async triggerSavedSearchAlerts(listingId: string) {
    const listing = await this.prisma.listing.findUnique({
      where: { id: listingId },
      select: { titleKu: true, price: true, categoryId: true, locationId: true },
    });
    if (!listing) return;

    const savedSearches = await this.prisma.savedSearch.findMany({
      where: { isActive: true },
    });

    await Promise.all(
      savedSearches.map(async (search: any) => {
        const prefs = await this.getPreferences(search.userId);
        if (!prefs.savedSearchAlerts) return;

        const filters = search.filters as Record<string, unknown>;
        const matchesCategory = !filters.categoryId || filters.categoryId === listing.categoryId;
        const matchesMaxPrice =
          !filters.maxPrice || Number(listing.price) <= Number(filters.maxPrice);
        if (!matchesCategory || !matchesMaxPrice) return;

        await this.create(
          search.userId,
          'saved_search_alert',
          `New listing for "${search.name}"`,
          listing.titleKu,
          { listingId, savedSearchId: search.id },
        );
      }),
    );
  }

  // ---------------------------------------------------------------------------
  // Push subscriptions
  // ---------------------------------------------------------------------------

  getVapidPublicKey(): string {
    return process.env.VAPID_PUBLIC_KEY ?? '';
  }

  async savePushSubscription(userId: string, subscription: object) {
    const endpoint = (subscription as { endpoint: string }).endpoint;
    await this.prisma.pushSubscription.upsert({
      where: { endpoint },
      create: { userId, endpoint, subscription: subscription as never },
      update: { subscription: subscription as never },
    });
  }

  async removePushSubscription(userId: string, endpoint: string) {
    await this.prisma.pushSubscription.deleteMany({ where: { userId, endpoint } });
  }

  /**
   * Send a multilingual push notification to all of a user's subscriptions.
   * Picks the best locale title/body based on the user's stored language preference.
   * Handles 410 Gone (expired) by deleting the subscription.
   */
  async sendPush(userId: string, payload: PushNotificationPayload): Promise<void> {
    if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) return;

    const subscriptions = await this.prisma.pushSubscription.findMany({ where: { userId } });
    if (subscriptions.length === 0) return;

    // Resolve best-fit title/body (fall back to EN → original)
    const title = payload.titleKu ?? payload.title;
    const body  = payload.bodyKu  ?? payload.body;

    const pushData = {
      title,
      body,
      icon:  payload.icon  ?? '/icons/icon-192x192.png',
      badge: payload.badge ?? '/icons/icon-72x72.png',
      url:   payload.url   ?? '/ku',
      tag:   payload.tag   ?? 'carsauto-notification',
      data:  payload.data  ?? {},
      // Include all locale variants so SW can pick based on client locale
      titleKu: payload.titleKu,
      titleAr: payload.titleAr,
      bodyKu:  payload.bodyKu,
      bodyAr:  payload.bodyAr,
    };

    await Promise.all(
      subscriptions.map(async (sub: any) => {
        try {
          await webpush.sendNotification(
            sub.subscription as unknown as webpush.PushSubscription,
            JSON.stringify(pushData),
          );
        } catch (err: unknown) {
          const status = (err as { statusCode?: number }).statusCode;
          if (status === 410 || status === 404) {
            // Subscription expired — clean up silently
            await this.prisma.pushSubscription
              .delete({ where: { id: sub.id } })
              .catch(() => {});
          } else {
            this.logger.error(`Web push failed for user ${userId}`, err);
          }
        }
      }),
    );
  }

  /**
   * @deprecated Use sendPush() instead — kept for backward compatibility.
   */
  async sendWebPush(userId: string, payload: { title: string; body: string; data?: unknown }) {
    return this.sendPush(userId, { title: payload.title, body: payload.body });
  }

  // ---------------------------------------------------------------------------
  // Preferences
  // ---------------------------------------------------------------------------

  async updatePreferences(
    userId: string,
    prefs: {
      emailEnabled?: boolean;
      pushEnabled?: boolean;
      savedSearchAlerts?: boolean;
      favoriteAlerts?: boolean;
    },
  ) {
    return this.prisma.notificationPreference.upsert({
      where: { userId },
      create: { userId, ...prefs },
      update: prefs,
    });
  }
}
