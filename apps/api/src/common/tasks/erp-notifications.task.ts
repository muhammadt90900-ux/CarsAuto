// apps/api/src/common/tasks/erp-notifications.task.ts
//
// Dealer ERP — Phase 4 (Notifications). Three daily checks, each reusing
// NotificationsService.create() (never a second notification-delivery
// path) and each de-duplicated by checking whether the same alert was
// already sent within its cooldown window — a dealer with 40 low-stock
// parts should get one grouped alert a day, not 40 separate ones, and a
// dealer already reminded about an expiring subscription this week
// shouldn't be reminded again tomorrow.

import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../../modules/notifications/notifications.service';
import { InventoryItemStatus } from '../prisma/enums';

const LOW_STOCK_COOLDOWN_HOURS = 24;
const SUBSCRIPTION_REMINDER_COOLDOWN_DAYS = 3;
const SUBSCRIPTION_EXPIRING_WINDOW_DAYS = 3;

@Injectable()
export class ErpNotificationsTask {
  private readonly logger = new Logger(ErpNotificationsTask.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  /** Was a notification of this type sent to this user within the last N hours? */
  private async wasRecentlyNotified(userId: string, type: string, withinHours: number) {
    const since = new Date(Date.now() - withinHours * 60 * 60 * 1000);
    const existing = await this.prisma.notification.findFirst({
      where: { userId, type, createdAt: { gte: since } },
      select: { id: true },
    });
    return !!existing;
  }

  @Cron(CronExpression.EVERY_DAY_AT_8AM)
  async checkLowStock() {
    const lowStockItems = await this.prisma.inventoryItem.findMany({
      where: { status: { in: [InventoryItemStatus.LOW_STOCK, InventoryItemStatus.OUT_OF_STOCK] } },
      include: { dealer: { select: { id: true, userId: true } } },
    });

    // Group by dealer so each dealer gets exactly one alert, not one per item.
    const byDealer = new Map<string, { userId: string; items: typeof lowStockItems }>();
    for (const item of lowStockItems) {
      const key = item.dealerId;
      if (!byDealer.has(key)) byDealer.set(key, { userId: item.dealer.userId, items: [] });
      byDealer.get(key)!.items.push(item);
    }

    for (const [, { userId, items }] of byDealer) {
      if (await this.wasRecentlyNotified(userId, 'LOW_STOCK_ALERT', LOW_STOCK_COOLDOWN_HOURS)) continue;

      const outOfStock = items.filter(i => i.status === InventoryItemStatus.OUT_OF_STOCK).length;
      const lowStock = items.length - outOfStock;
      const body = [
        outOfStock > 0 ? `${outOfStock} کاڵا تەواو بووە / ${outOfStock} out of stock` : null,
        lowStock > 0 ? `${lowStock} کاڵا کەم بۆتەوە / ${lowStock} running low` : null,
      ].filter(Boolean).join(' · ');

      await this.notifications.create(
        userId,
        'LOW_STOCK_ALERT',
        'ئاگاداری کۆگا / Inventory Alert',
        body,
        { itemIds: items.map(i => i.id) },
      );
    }

    this.logger.log(`Low-stock check: ${byDealer.size} dealer(s) with low/out-of-stock items`);
  }

  @Cron(CronExpression.EVERY_DAY_AT_9AM)
  async checkSubscriptionExpiring() {
    const windowEnd = new Date(Date.now() + SUBSCRIPTION_EXPIRING_WINDOW_DAYS * 24 * 60 * 60 * 1000);
    const expiring = await this.prisma.subscription.findMany({
      where: {
        status: 'ACTIVE',
        currentPeriodEnd: { gte: new Date(), lte: windowEnd },
        cancelAtPeriodEnd: false, // already leaving on purpose — no need to nudge them to renew
      },
      select: { userId: true, currentPeriodEnd: true, plan: true },
    });

    let sent = 0;
    for (const sub of expiring) {
      if (await this.wasRecentlyNotified(sub.userId, 'SUBSCRIPTION_EXPIRING', SUBSCRIPTION_REMINDER_COOLDOWN_DAYS * 24)) continue;
      const daysLeft = Math.ceil((sub.currentPeriodEnd!.getTime() - Date.now()) / (24 * 60 * 60 * 1000));
      await this.notifications.create(
        sub.userId,
        'SUBSCRIPTION_EXPIRING',
        'بەرواری کۆتایی subscription نزیک بووەتەوە / Subscription Expiring Soon',
        `subscription-ی ${sub.plan} تۆ لە ${daysLeft} ڕۆژدا کۆتایی دێت / Your ${sub.plan} subscription renews in ${daysLeft} day(s)`,
      );
      sent++;
    }
    this.logger.log(`Subscription-expiring check: ${sent} reminder(s) sent`);
  }

  @Cron(CronExpression.EVERY_DAY_AT_9AM)
  async checkPastDuePayments() {
    const pastDue = await this.prisma.subscription.findMany({
      where: { status: 'PAST_DUE' },
      select: { userId: true, plan: true },
    });

    let sent = 0;
    for (const sub of pastDue) {
      if (await this.wasRecentlyNotified(sub.userId, 'PAYMENT_REMINDER', SUBSCRIPTION_REMINDER_COOLDOWN_DAYS * 24)) continue;
      await this.notifications.create(
        sub.userId,
        'PAYMENT_REMINDER',
        'پارەدان سەرکەوتوو نەبوو / Payment Reminder',
        `پارەدانی subscription-ی ${sub.plan} سەرکەوتوو نەبوو، تکایە نوێی بکەرەوە / Your ${sub.plan} subscription payment failed — please update it to avoid interruption`,
      );
      sent++;
    }
    this.logger.log(`Past-due payment check: ${sent} reminder(s) sent`);
  }
}
