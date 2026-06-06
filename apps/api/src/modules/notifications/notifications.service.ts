import { Injectable, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import * as webpush from 'web-push';
import { PrismaService } from '../../common/prisma/prisma.service';

export type NotificationType =
  | 'new_message'
  | 'listing_sold'
  | 'price_drop'
  | 'favorite_alert'
  | 'saved_search_alert'
  | 'offer_received'
  | 'offer_accepted'
  | 'offer_declined'
  | 'system';

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
        `mailto:${process.env.VAPID_EMAIL ?? 'noreply@example.com'}`,
        process.env.VAPID_PUBLIC_KEY,
        process.env.VAPID_PRIVATE_KEY,
      );
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
   * Trigger favourite-item alerts for all users who saved this listing.
   */
  async triggerFavoriteAlerts(listingId: string, eventType: 'price_drop' | 'listing_sold') {
    const favorites = await this.prisma.favorite.findMany({
      where: { listingId },
      include: { listing: { select: { titleKu: true, price: true } } },
    });

    await Promise.all(
      favorites.map(async ({ userId, listing }) => {
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
      savedSearches.map(async (search) => {
        const prefs = await this.getPreferences(search.userId);
        if (!prefs.savedSearchAlerts) return;

        // Simple keyword matching — replace with full-text / Elasticsearch as needed
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

  async sendWebPush(userId: string, payload: { title: string; body: string; data?: unknown }) {
    const subscriptions = await this.prisma.pushSubscription.findMany({ where: { userId } });

    await Promise.all(
      subscriptions.map(async (sub) => {
        try {
          await webpush.sendNotification(
            sub.subscription as unknown as webpush.PushSubscription,
            JSON.stringify(payload),
          );
        } catch (err: unknown) {
          // 410 Gone = subscription expired; clean up
          const status = (err as { statusCode?: number }).statusCode;
          if (status === 410 || status === 404) {
            await this.prisma.pushSubscription.delete({ where: { id: sub.id } });
          } else {
            this.logger.error('Web push failed', err);
          }
        }
      }),
    );
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
