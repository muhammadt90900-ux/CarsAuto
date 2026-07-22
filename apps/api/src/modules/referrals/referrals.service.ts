// apps/api/src/modules/referrals/referrals.service.ts
//
// Core of the Referral & Rewards System. Deliberately reuses existing
// infrastructure rather than inventing parallel ones:
//   - DealerBadge (existing model)      → Gold Partner / VIP Dealer / Ambassador
//   - DealerSubscription (existing model) → "+N Premium Months" reward
//   - NotificationsService (existing)   → referral/reward notifications
//   - referral-code.util (shared with BetaRegistration) → "CA-XXXXXX" codes
//
// Qualification is intentionally a small state machine driven by three
// independent boolean flags on the Referral row (dealerApproved,
// accountVerified, hasPublishedListing), each flipped by its own event
// listener. tryQualify() is the only place that flips PENDING → QUALIFIED,
// and it does so with a single conditional `updateMany` WHERE clause so two
// events racing each other (e.g. dealer.verified and listing.created firing
// moments apart) can never double-qualify or double-reward a referral.

import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { NotificationsService, NotificationType } from '../notifications/notifications.service';
import { DealerStatus, ReferralStatus, SubscriptionPlan, SubscriptionStatus } from '@/common/prisma/enums';
import { generateUniqueReferralCode } from '@/common/utils/referral-code.util';
import { SORTED_REFERRAL_REWARD_TIERS, nextMilestone } from './referral-rewards.config';
import {
  DealerAppliedEvent,
  DealerVerifiedEvent,
  UserEmailVerifiedEvent,
  ListingCreatedEvent,
} from '@/common/events';

const PREMIUM_MONTH_MS = 30 * 24 * 60 * 60 * 1000;

@Injectable()
export class ReferralsService {
  private readonly logger = new Logger(ReferralsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  // ── Referral code assignment (every VERIFIED dealer gets one, once) ───────

  async ensureReferralCode(dealerId: string): Promise<string> {
    const dealer = await this.prisma.dealer.findUnique({
      where: { id: dealerId },
      select: { referralCode: true },
    });
    if (dealer?.referralCode) return dealer.referralCode;

    const code = await generateUniqueReferralCode(async (candidate) => {
      const existing = await this.prisma.dealer.findUnique({
        where: { referralCode: candidate },
        select: { id: true },
      });
      return !!existing;
    });

    const updated = await this.prisma.dealer.update({
      where: { id: dealerId },
      data: { referralCode: code },
      select: { referralCode: true },
    });
    return updated.referralCode!;
  }

  // ── Event handlers (called from ReferralListeners) ─────────────────────────

  /** A new dealer application arrived with a referral code. */
  async onDealerApplied(event: DealerAppliedEvent): Promise<void> {
    if (!event.referralCodeUsed) return;

    const code = event.referralCodeUsed.trim().toUpperCase();
    const referrer = await this.prisma.dealer.findUnique({
      where: { referralCode: code },
      select: { id: true, userId: true, status: true },
    });

    if (!referrer) {
      this.logger.warn(`dealer.applied: unknown referral code "${code}" (dealer ${event.dealerId})`);
      return; // invalid code — silently ignored, applicant's dealer profile is still created
    }
    if (referrer.status !== DealerStatus.VERIFIED) {
      this.logger.warn(`dealer.applied: referral code "${code}" belongs to a non-verified dealer`);
      return;
    }
    // Self-referral guard.
    if (referrer.userId === event.userId) {
      this.logger.warn(`dealer.applied: self-referral attempt blocked (user ${event.userId})`);
      return;
    }
    // Duplicate-referral guard (a user can only ever be referred once) —
    // the @@unique on Referral.referredUserId is the hard backstop; this is
    // just a cheap pre-check to avoid a needless failed insert.
    const already = await this.prisma.referral.findUnique({
      where: { referredUserId: event.userId },
      select: { id: true },
    });
    if (already) {
      this.logger.warn(`dealer.applied: user ${event.userId} was already referred — ignoring second code`);
      return;
    }

    const user = await this.prisma.user.findUnique({
      where: { id: event.userId },
      select: { verified: true },
    });

    let referral;
    try {
      referral = await this.prisma.referral.create({
        data: {
          referrerDealerId: referrer.id,
          referredUserId: event.userId,
          referredDealerId: event.dealerId,
          referralCodeUsed: code,
          accountVerified: !!user?.verified,
        },
      });
    } catch (err: any) {
      if (err?.code === 'P2002') return; // race — another request already created it
      throw err;
    }

    await this.prisma.dealer.update({
      where: { id: referrer.id },
      data: { referralCount: { increment: 1 } },
    });

    // The referred user may already have a verified email by the time they
    // apply as a dealer — re-check immediately rather than waiting for a
    // user.email_verified event that will never fire again.
    if (referral.accountVerified) {
      await this.tryQualify(referral.id);
    }
  }

  /** A dealer (referrer OR referred) was just approved for the first time. */
  async onDealerVerified(event: DealerVerifiedEvent): Promise<void> {
    // 1. Every approved dealer gets a permanent referral code.
    await this.ensureReferralCode(event.dealerId).catch((err) =>
      this.logger.warn(`ensureReferralCode failed for dealer ${event.dealerId}: ${err.message}`),
    );

    // 2. If this dealer was itself referred, mark the "approved" condition.
    const referral = await this.prisma.referral.findFirst({
      where: { referredDealerId: event.dealerId, status: ReferralStatus.PENDING },
      select: { id: true },
    });
    if (!referral) return;

    await this.prisma.referral.update({
      where: { id: referral.id },
      data: { dealerApproved: true },
    });
    await this.tryQualify(referral.id);
  }

  /** A user confirmed their email. */
  async onUserEmailVerified(event: UserEmailVerifiedEvent): Promise<void> {
    const referral = await this.prisma.referral.findFirst({
      where: { referredUserId: event.userId, status: ReferralStatus.PENDING },
      select: { id: true },
    });
    if (!referral) return;

    await this.prisma.referral.update({
      where: { id: referral.id },
      data: { accountVerified: true },
    });
    await this.tryQualify(referral.id);
  }

  /** A dealer's published (ACTIVE) listing was created. */
  async onListingCreated(event: ListingCreatedEvent): Promise<void> {
    if (!event.dealerId) return;
    const referral = await this.prisma.referral.findFirst({
      where: { referredDealerId: event.dealerId, status: ReferralStatus.PENDING },
      select: { id: true },
    });
    if (!referral) return;

    await this.prisma.referral.update({
      where: { id: referral.id },
      data: { hasPublishedListing: true },
    });
    await this.tryQualify(referral.id);
  }

  // ── Qualification + rewards ────────────────────────────────────────────────

  private async tryQualify(referralId: string): Promise<void> {
    // Atomic conditional flip — only succeeds if all 3 conditions are true
    // AND the row is still PENDING. Prevents double-qualification if two
    // events race each other.
    const flipped = await this.prisma.referral.updateMany({
      where: {
        id: referralId,
        status: ReferralStatus.PENDING,
        dealerApproved: true,
        accountVerified: true,
        hasPublishedListing: true,
      },
      data: { status: ReferralStatus.QUALIFIED, qualifiedAt: new Date() },
    });
    if (flipped.count === 0) return;

    const referral = await this.prisma.referral.findUnique({
      where: { id: referralId },
      select: {
        referrerDealerId: true,
        referredUser: { select: { name: true } },
      },
    });
    if (!referral) return;

    const dealer = await this.prisma.dealer.update({
      where: { id: referral.referrerDealerId },
      data: { qualifiedReferralCount: { increment: 1 } },
      select: {
        id: true, userId: true, qualifiedReferralCount: true,
        lastReferralMilestone: true, nameKu: true, nameEn: true,
      },
    });

    await this.notifications.create(
      dealer.userId,
      'REFERRAL_QUALIFIED' as NotificationType,
      'ڕیفێڕاڵێکی نوێ سەرکەوتوو بوو 🎉',
      `${referral.referredUser?.name ?? 'بەکارهێنەرێک'} بوو بە فرۆشیارێکی چالاک لەڕێگەی کۆدی ڕیفێڕاڵی تۆوە.`,
      { referralId },
    );

    await this.grantMilestoneRewards(dealer);
  }

  private async grantMilestoneRewards(dealer: {
    id: string; userId: string; qualifiedReferralCount: number; lastReferralMilestone: number;
  }): Promise<void> {
    const tiersToGrant = SORTED_REFERRAL_REWARD_TIERS.filter(
      (t) => t.milestone > dealer.lastReferralMilestone && t.milestone <= dealer.qualifiedReferralCount,
    );
    if (tiersToGrant.length === 0) return;

    for (const tier of tiersToGrant) {
      if (tier.type === 'PREMIUM_MONTHS' && tier.premiumMonths) {
        await this.grantPremiumMonths(dealer.id, dealer.userId, tier.premiumMonths);
      } else if (tier.type === 'BADGE' && tier.badgeCode) {
        await this.grantBadge(dealer.id, dealer.userId, tier.badgeCode, tier.badgeLabel!, tier.badgeIcon);
      }

      await this.prisma.dealer.update({
        where: { id: dealer.id },
        data: { lastReferralMilestone: tier.milestone },
      });
    }
  }

  /** Extends (or upgrades, if currently FREE) the dealer's subscription — same
   * shape of write SubscriptionsService.confirmSubscription() makes for a
   * paid purchase, just without a payment. */
  private async grantPremiumMonths(dealerId: string, userId: string, months: number): Promise<void> {
    const existing = await this.prisma.dealerSubscription.findUnique({ where: { dealerId } });
    const now = new Date();
    const base = existing?.currentPeriodEnd && existing.currentPeriodEnd > now
      ? existing.currentPeriodEnd
      : now;
    const newEnd = new Date(base.getTime() + months * PREMIUM_MONTH_MS);

    if (existing) {
      await this.prisma.dealerSubscription.update({
        where: { dealerId },
        data: {
          // FREE dealers get bumped to STARTER for the reward period so the
          // reward is actually meaningful; paid dealers just get time added
          // on top of whatever plan they're already paying for.
          plan: existing.plan === SubscriptionPlan.FREE ? SubscriptionPlan.STARTER : existing.plan,
          status: SubscriptionStatus.ACTIVE,
          currentPeriodStart: existing.currentPeriodStart ?? now,
          currentPeriodEnd: newEnd,
        },
      });
    } else {
      await this.prisma.dealerSubscription.create({
        data: {
          dealerId,
          plan: SubscriptionPlan.STARTER,
          status: SubscriptionStatus.ACTIVE,
          currentPeriodStart: now,
          currentPeriodEnd: newEnd,
        },
      });
    }

    await this.prisma.dealer.update({
      where: { id: dealerId },
      data: { premiumMonthsEarned: { increment: months } },
    });

    await this.notifications.create(
      userId,
      'REFERRAL_REWARD_PREMIUM' as NotificationType,
      `پاداشتت وەرگرت: ${months} مانگی پرێمیۆم! 🎁`,
      `بەهۆی ڕیفێڕاڵە سەرکەوتووەکانتەوە، ${months} مانگی پرێمیۆم بۆ هەژماری فرۆشیارییەکەت زیادکرا.`,
      { premiumMonths: months },
    );
  }

  private async grantBadge(
    dealerId: string, userId: string, code: string, label: string, icon?: string,
  ): Promise<void> {
    const existing = await this.prisma.dealerBadge.findFirst({ where: { dealerId, code } });
    if (existing) return; // idempotency guard — never award the same badge twice

    await this.prisma.dealerBadge.create({
      data: { dealerId, code, label, icon },
    });

    await this.notifications.create(
      userId,
      'REFERRAL_BADGE_EARNED' as NotificationType,
      `مۆری نوێت بەدەستهێنا: ${label} 🏅`,
      `بەهۆی چالاکیت لە پڕۆگرامی ڕیفێڕاڵدا، مۆری "${label}" بۆ پرۆفایلی فرۆشیارییەکەت زیادکرا.`,
      { badgeCode: code },
    );
  }

  // ── Dashboard (seller-facing) ───────────────────────────────────────────────

  async getDashboard(userId: string) {
    const dealer = await this.prisma.dealer.findUnique({
      where: { userId },
      select: {
        id: true, referralCode: true, referralCount: true,
        qualifiedReferralCount: true, lastReferralMilestone: true,
        premiumMonthsEarned: true, status: true,
      },
    });
    if (!dealer) {
      throw new BadRequestException('Only approved dealers have a referral program');
    }

    const [pending, rejected, history, badges] = await Promise.all([
      this.prisma.referral.count({ where: { referrerDealerId: dealer.id, status: ReferralStatus.PENDING } }),
      this.prisma.referral.count({ where: { referrerDealerId: dealer.id, status: { in: [ReferralStatus.REJECTED, ReferralStatus.SUSPENDED] } } }),
      this.prisma.referral.findMany({
        where: { referrerDealerId: dealer.id },
        orderBy: { createdAt: 'desc' },
        take: 50,
        select: {
          id: true, status: true, createdAt: true, qualifiedAt: true,
          dealerApproved: true, accountVerified: true, hasPublishedListing: true,
          referredUser: { select: { name: true } },
        },
      }),
      this.prisma.dealerBadge.findMany({
        where: {
          dealerId: dealer.id,
          code: { in: SORTED_REFERRAL_REWARD_TIERS.filter((t) => t.type === 'BADGE').map((t) => t.badgeCode!) },
        },
        select: { code: true, label: true, icon: true, awardedAt: true },
      }),
    ]);

    return {
      referralCode: dealer.referralCode,
      totalReferrals: dealer.referralCount,
      successfulReferrals: dealer.qualifiedReferralCount,
      pendingReferrals: pending,
      rejectedReferrals: rejected,
      premiumMonthsEarned: dealer.premiumMonthsEarned,
      lastMilestone: dealer.lastReferralMilestone,
      nextMilestone: nextMilestone(dealer.qualifiedReferralCount),
      rewardTiers: SORTED_REFERRAL_REWARD_TIERS,
      badges,
      history,
    };
  }

  // ── Admin ────────────────────────────────────────────────────────────────

  async adminList(params: { status?: string; search?: string; page?: number; limit?: number }) {
    const page = params.page && params.page > 0 ? params.page : 1;
    const limit = params.limit && params.limit > 0 ? params.limit : 20;

    const where: Record<string, unknown> = {};
    if (params.status) where.status = params.status;
    if (params.search) {
      where.OR = [
        { referralCodeUsed: { contains: params.search, mode: 'insensitive' } },
        { referrerDealer: { nameEn: { contains: params.search, mode: 'insensitive' } } },
        { referredUser: { name: { contains: params.search, mode: 'insensitive' } } },
        { referredUser: { email: { contains: params.search, mode: 'insensitive' } } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.referral.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          referrerDealer: { select: { id: true, nameEn: true, nameKu: true, slug: true, referralCode: true } },
          referredUser: { select: { id: true, name: true, email: true } },
        },
      }),
      this.prisma.referral.count({ where }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async adminApprove(referralId: string) {
    const referral = await this.prisma.referral.update({
      where: { id: referralId },
      data: { status: ReferralStatus.PENDING, rejectedAt: null, rejectedReason: null },
    });
    await this.tryQualify(referralId);
    return referral;
  }

  async adminReject(referralId: string, reason?: string) {
    return this.prisma.referral.update({
      where: { id: referralId },
      data: { status: ReferralStatus.REJECTED, rejectedAt: new Date(), rejectedReason: reason },
    });
  }

  async adminSuspend(referralId: string) {
    return this.prisma.referral.update({
      where: { id: referralId },
      data: { status: ReferralStatus.SUSPENDED },
    });
  }

  async adminLeaderboard(limit = 20) {
    return this.prisma.dealer.findMany({
      where: { qualifiedReferralCount: { gt: 0 } },
      orderBy: { qualifiedReferralCount: 'desc' },
      take: limit,
      select: {
        id: true, nameEn: true, nameKu: true, slug: true, referralCode: true,
        referralCount: true, qualifiedReferralCount: true, premiumMonthsEarned: true,
        lastReferralMilestone: true,
      },
    });
  }

  async adminStats() {
    const [total, qualified, pending, rejected] = await Promise.all([
      this.prisma.referral.count(),
      this.prisma.referral.count({ where: { status: ReferralStatus.QUALIFIED } }),
      this.prisma.referral.count({ where: { status: ReferralStatus.PENDING } }),
      this.prisma.referral.count({ where: { status: { in: [ReferralStatus.REJECTED, ReferralStatus.SUSPENDED] } } }),
    ]);
    return { total, qualified, pending, rejected };
  }

  async adminTree(dealerId: string) {
    const dealer = await this.prisma.dealer.findUnique({
      where: { id: dealerId },
      select: { id: true, nameEn: true, nameKu: true, referralCode: true, qualifiedReferralCount: true },
    });
    if (!dealer) throw new BadRequestException('Dealer not found');

    const referrals = await this.prisma.referral.findMany({
      where: { referrerDealerId: dealerId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, status: true, createdAt: true, qualifiedAt: true,
        referredUser: { select: { name: true, email: true } },
        referredDealerId: true,
      },
    });

    return { dealer, referrals };
  }
}
