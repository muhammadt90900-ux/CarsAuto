/**
 * apps/api/src/modules/suspicious-activity/suspicious-activity.service.ts
 *
 * Trust & Safety Prompt 5 — real-time alerting layer. This service owns:
 *   1. notifyAdminsIfSevere() — the shared "severity >= 80 → push
 *      Notification to every ADMIN" behavior, called from BOTH this file's
 *      own new checks AND (via a small addition to duplicate-detection.service.ts)
 *      the VIN/image/text tiers already built in Prompt 3, so all trigger
 *      points funnel through one alerting rule instead of each
 *      reimplementing "who counts as severe" and "how do we tell admins."
 *   2. Two brand-new real-time checks this prompt asks for: RAPID_RELIST
 *      and MESSAGE_VELOCITY_SPIKE (the live-alert sibling of
 *      FraudScoringService's nightly messageVelocity signal — same query,
 *      via message-velocity.helper.ts, different threshold/purpose).
 *   3. A real-time (per-message) off-platform-payment-language check,
 *      distinct from FraudScoringService's nightly aggregate signal of the
 *      same name — this one fires the moment a message is sent, not once
 *      a day across up to 50 messages.
 *
 * Deliberately does NOT auto-suspend, auto-ban, or auto-quarantine
 * anything — alerts only, exactly as instructed. RAPID_RELIST in
 * particular does NOT set the new listing to UNDER_REVIEW (unlike Prompt
 * 3's VIN-clash tier, which does — that was this project's explicit
 * instruction for VIN clashes specifically, not a general rule extended
 * here).
 */

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { AiService } from '../ai/ai.service';
import { countRecentMessages } from '../fraud/message-velocity.helper';

const ADMIN_ALERT_SEVERITY_THRESHOLD = 80;

const RAPID_RELIST_WINDOW_HOURS = 24;
const RAPID_RELIST_SEVERITY = 70;

const MESSAGE_VELOCITY_SPIKE_WINDOW_HOURS = 24;
// Deliberately higher than FraudScoringService's MESSAGE_VELOCITY_HIGH_THRESHOLD
// (100) — that constant caps the NIGHTLY score contribution at 100%; this
// one gates a live page to admins, so it should only fire for a genuinely
// extreme burst, not merely "high" by the nightly-scoring bar.
const MESSAGE_VELOCITY_SPIKE_THRESHOLD = 150;
const MESSAGE_VELOCITY_SPIKE_SEVERITY = 85;

const OFFPLATFORM_MESSAGE_SEVERITY = 80;

// Shared de-dupe window for the two NEW live checks below — same purpose
// as duplicate-detection.service.ts's recentFlagExists(): don't re-alert
// admins every single time the same condition is still true (every message
// after the 150th, every relist attempt in the same 24h window).
const ALERT_DEDUPE_WINDOW_HOURS = 24;

@Injectable()
export class SuspiciousActivityService {
  private readonly logger = new Logger(SuspiciousActivityService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly ai: AiService,
  ) {}

  // ── Shared alert plumbing (used by this file AND duplicate-detection.service.ts) ──

  /**
   * Pushes a Notification to every ADMIN-role user if severity crosses the
   * threshold. Does NOT create the SuspiciousActivityEvent row itself —
   * callers that already create the row inside their own transaction
   * (duplicate-detection.service.ts's three tiers) call this separately,
   * right after their transaction commits; callers that don't have an
   * existing row/transaction should use createEvent() below instead, which
   * does both.
   */
  async notifyAdminsIfSevere(
    eventType: string,
    severity: number,
    metadata: Record<string, unknown>,
  ): Promise<void> {
    if (severity < ADMIN_ALERT_SEVERITY_THRESHOLD) return;

    try {
      const admins = await this.prisma.user.findMany({
        where: { role: 'ADMIN', banned: false },
        select: { id: true },
      });
      if (admins.length === 0) return;

      await this.notifications.createManyForUsers(
        admins.map((a: { id: string }) => a.id),
        'SUSPICIOUS_ACTIVITY_ALERT',
        `ئاگاداری چالاکی گومانلێکراو / Suspicious Activity Alert: ${eventType}`,
        `ڕووداوێکی چالاکی گومانلێکراو بە severity ${severity} تۆمار کرا. / A suspicious activity event was recorded with severity ${severity}.`,
        { eventType, severity, ...metadata },
      );
    } catch (err) {
      // Never let a failed admin notification block the caller's own flow.
      this.logger.warn(`Failed to notify admins of ${eventType} (severity ${severity}): ${(err as Error).message}`);
    }
  }

  /** Creates the SuspiciousActivityEvent row AND alerts admins if severe. Used by the two live checks below. */
  private async createEvent(
    userId: string,
    eventType: string,
    severity: number,
    metadata: Record<string, unknown>,
  ): Promise<void> {
    await this.prisma.suspiciousActivityEvent.create({
      data: { userId, eventType, severity, metadata },
    });
    await this.notifyAdminsIfSevere(eventType, severity, { userId, ...metadata });
  }

  private async recentEventExists(userId: string, eventType: string, windowHours: number): Promise<boolean> {
    const since = new Date(Date.now() - windowHours * 3600 * 1000);
    const existing = await this.prisma.suspiciousActivityEvent.findFirst({
      where: { userId, eventType, createdAt: { gte: since } },
      select: { id: true },
    });
    return !!existing;
  }

  // ── RAPID_RELIST (triggered on listing CREATE only) ─────────────────────

  async checkRapidRelist(listingId: string, userId: string): Promise<void> {
    try {
      const listing = await this.prisma.listing.findUnique({
        where: { id: listingId },
        select: { titleKu: true, titleAr: true, titleEn: true, price: true },
      });
      if (!listing) return;

      const since = new Date(Date.now() - RAPID_RELIST_WINDOW_HOURS * 3600 * 1000);

      const priorKilledListing = await this.prisma.listing.findFirst({
        where: {
          userId,
          id: { not: listingId },
          price: listing.price,
          AND: [
            { OR: [{ titleKu: listing.titleKu }, { titleAr: listing.titleAr }, { titleEn: listing.titleEn }] },
            {
              OR: [
                { deletedAt: { not: null, gte: since } },
                { status: 'UNDER_REVIEW', updatedAt: { gte: since } },
              ],
            },
          ],
        },
        select: { id: true },
      });
      if (!priorKilledListing) return;

      if (await this.recentEventExists(userId, 'RAPID_RELIST', ALERT_DEDUPE_WINDOW_HOURS)) return;

      await this.createEvent(userId, 'RAPID_RELIST', RAPID_RELIST_SEVERITY, {
        newListingId: listingId,
        priorListingId: priorKilledListing.id,
      });

      this.logger.warn(`Rapid relist: user ${userId} recreated listing ${priorKilledListing.id} as ${listingId}`);
    } catch (err) {
      this.logger.warn(`RAPID_RELIST check failed for listing ${listingId}: ${(err as Error).message}`);
    }
  }

  // ── MESSAGE_VELOCITY_SPIKE + real-time off-platform-payment (per message sent) ──

  async checkMessage(userId: string, content: string, messageType: string): Promise<void> {
    if (messageType !== 'text') return; // voice/image/offer content isn't meaningful text to scan
    await Promise.all([
      this.checkMessageVelocitySpike(userId),
      this.checkOffPlatformPaymentMessage(userId, content),
    ]);
  }

  private async checkMessageVelocitySpike(userId: string): Promise<void> {
    try {
      const count = await countRecentMessages(this.prisma, userId, MESSAGE_VELOCITY_SPIKE_WINDOW_HOURS);
      if (count < MESSAGE_VELOCITY_SPIKE_THRESHOLD) return;

      if (await this.recentEventExists(userId, 'MESSAGE_VELOCITY_SPIKE', ALERT_DEDUPE_WINDOW_HOURS)) return;

      await this.createEvent(userId, 'MESSAGE_VELOCITY_SPIKE', MESSAGE_VELOCITY_SPIKE_SEVERITY, {
        messageCount: count,
        windowHours: MESSAGE_VELOCITY_SPIKE_WINDOW_HOURS,
      });

      this.logger.warn(`Message velocity spike: user ${userId} sent ${count} messages in ${MESSAGE_VELOCITY_SPIKE_WINDOW_HOURS}h`);
    } catch (err) {
      this.logger.warn(`MESSAGE_VELOCITY_SPIKE check failed for user ${userId}: ${(err as Error).message}`);
    }
  }

  private async checkOffPlatformPaymentMessage(userId: string, content: string): Promise<void> {
    try {
      const { matched, hits } = this.ai.detectOffPlatformPaymentLanguage(content);
      if (!matched) return;

      if (await this.recentEventExists(userId, 'OFFPLATFORM_PAYMENT_ASK', ALERT_DEDUPE_WINDOW_HOURS)) return;

      await this.createEvent(userId, 'OFFPLATFORM_PAYMENT_ASK', OFFPLATFORM_MESSAGE_SEVERITY, {
        matchedTerms: hits,
      });

      this.logger.warn(`Off-platform payment language detected in a message from user ${userId}`);
    } catch (err) {
      this.logger.warn(`OFFPLATFORM_PAYMENT_ASK check failed for user ${userId}: ${(err as Error).message}`);
    }
  }

  // ── Admin queue (GET /admin/suspicious-activity) ────────────────────────

  async getQueue(page: number, limit: number, eventType?: string, minSeverity?: number) {
    const safePage = Math.max(1, page);
    const safeLimit = Math.min(100, Math.max(1, limit));

    const where: Record<string, unknown> = {};
    if (eventType) where.eventType = eventType;
    if (typeof minSeverity === 'number' && !Number.isNaN(minSeverity)) {
      where.severity = { gte: minSeverity };
    }

    const [data, total] = await Promise.all([
      this.prisma.suspiciousActivityEvent.findMany({
        where,
        orderBy: [{ severity: 'desc' }, { createdAt: 'desc' }],
        skip: (safePage - 1) * safeLimit,
        take: safeLimit,
        include: { user: { select: { id: true, name: true, email: true } } },
      }),
      this.prisma.suspiciousActivityEvent.count({ where }),
    ]);

    return { data, total, page: safePage, limit: safeLimit, totalPages: Math.ceil(total / safeLimit) };
  }
}
