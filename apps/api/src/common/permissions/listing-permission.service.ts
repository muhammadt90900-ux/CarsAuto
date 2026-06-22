// apps/api/src/common/permissions/listing-permission.service.ts
//
// Single source of truth for "can this user create a listing?"
// Called by ListingsController.create() and UploadController endpoints.
// Also exposes getPermissionStatus() for the frontend status endpoint.
//
// ── Role behaviour ───────────────────────────────────────────────────────────
//   ADMIN  → always allowed
//   DEALER → 30-day trial (50 posts) then paid DealerSubscription
//   USER   → must have active Subscription with plan='BUYER' ($2.99/month)
//            capped at BUYER_MONTHLY_LIMIT (2) listings per calendar month

import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

// ── Constants ─────────────────────────────────────────────────────────────────
const TRIAL_DAYS         = 30;
const TRIAL_POST_LIMIT   = 50;
const BUYER_MONTHLY_LIMIT = 2;
const BUYER_PLAN_ID      = 'BUYER';

// Listing statuses that count toward the dealer trial cap
const ACTIVE_STATUSES = ['ACTIVE', 'DRAFT', 'PENDING', 'SOLD'] as const;

export type PermissionReason =
  | 'ADMIN'
  | 'SUBSCRIBED'
  | 'TRIAL'
  | 'TRIAL_EXPIRED'
  | 'LIMIT_REACHED'
  | 'NOT_DEALER'
  | 'BUYER_SUBSCRIBED'
  | 'BUYER_MONTHLY_LIMIT_REACHED'
  | 'BUYER_NOT_SUBSCRIBED';

export interface PermissionStatus {
  canPost:                boolean;
  reason:                 PermissionReason;
  trialEnd?:              Date;
  trialPostsUsed?:        number;
  trialPostsRemaining?:   number;
  subscriptionEnd?:       Date;
  plan?:                  string;
  // Buyer-specific
  monthlyUsed?:           number;
  monthlyLimit?:          number;
  monthlyRemaining?:      number;
}

@Injectable()
export class ListingPermissionService {
  constructor(private readonly prisma: PrismaService) {}

  // ── checkCanPost ──────────────────────────────────────────────────────────
  // Throws ForbiddenException if the user may not create a listing.
  // Returns void (no throw) when posting is allowed.

  async checkCanPost(userId: string): Promise<void> {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { role: true, createdAt: true },
    });

    // 1. ADMIN — always allowed
    if (user.role === 'ADMIN') return;

    // 2. USER (buyer) — allowed with active BUYER subscription + monthly cap
    if (user.role === 'USER') {
      await this.checkBuyerCanPost(userId);
      return;
    }

    // 3. Non-DEALER (covers any future role additions) — blocked
    if (user.role !== 'DEALER') {
      throw new ForbiddenException({
        ku: 'تەنها فرۆشیار دەتوانێت ئۆگهێل بدات',
        en: 'Only dealers can create listings',
        code: 'ROLE_NOT_DEALER',
      });
    }

    // 4. DEALER path: Check for an active subscription (endDate in the future)
    const activeSub = await this.prisma.dealerSubscription.findFirst({
      where: {
        dealer:           { userId },
        currentPeriodEnd: { gt: new Date() },
        status:           'ACTIVE',
      },
      orderBy: { currentPeriodEnd: 'desc' },
    });

    if (activeSub) return; // subscribed → unlimited

    // 5. Trial window check
    const trialEnd = this.calcTrialEnd(user.createdAt);
    const now      = new Date();

    if (now > trialEnd) {
      throw new ForbiddenException({
        ku: 'ماوەی تاقیکردنەوەی خۆڕایت تەواو بوو، تکایە بەشداری بکە',
        en: 'Your free trial has expired. Please subscribe to continue posting.',
        code: 'TRIAL_EXPIRED',
        upgradeUrl: '/pricing',
      });
    }

    // 6. Within trial — check post count
    const activeCount = await this.prisma.listing.count({
      where: {
        userId,
        status: { in: ACTIVE_STATUSES as unknown as any[] },
      },
    });

    if (activeCount >= TRIAL_POST_LIMIT) {
      throw new ForbiddenException({
        ku: `گەیشتیتە سنووری ${TRIAL_POST_LIMIT} پۆستی خۆڕایی، تکایە بەشداری بکە`,
        en: `You have reached the ${TRIAL_POST_LIMIT}-post free trial limit. Please subscribe.`,
        code: 'TRIAL_LIMIT_REACHED',
        upgradeUrl: '/pricing',
      });
    }

    // 7. Within trial and under limit → allowed
  }

  // ── checkBuyerCanPost ─────────────────────────────────────────────────────
  // USER-role buyer posting gate: needs BUYER plan subscription + ≤2/month cap

  private async checkBuyerCanPost(userId: string): Promise<void> {
    const buyerSub = await this.prisma.subscription.findFirst({
      where: {
        userId,
        plan:             BUYER_PLAN_ID,
        status:           'active',
        currentPeriodEnd: { gt: new Date() },
      },
    });

    if (!buyerSub) {
      throw new ForbiddenException({
        ku: 'تکایە پلانی کڕیار ($2.99/مانگ) بسەبسکە بۆ ناردنی ئەلان',
        en: `Please subscribe to the Buyer Plan ($2.99/month) to post listings.`,
        ar: 'يرجى الاشتراك في خطة المشتري ($2.99/شهر) لنشر الإعلانات.',
        zh: '请订阅买家计划（$2.99/月）以发布广告。',
        code: 'BUYER_NOT_SUBSCRIBED',
        upgradeUrl: '/dashboard/subscription',
      });
    }

    const monthlyCount = await this.getBuyerMonthlyCount(userId);

    if (monthlyCount >= BUYER_MONTHLY_LIMIT) {
      throw new ForbiddenException({
        ku: `گەیشتیتە سنووری ${BUYER_MONTHLY_LIMIT} ئەلانی مانگانە بۆ پلانی کڕیار`,
        en: `You have reached the ${BUYER_MONTHLY_LIMIT}-listing monthly limit for the Buyer Plan. Upgrade to Dealer for unlimited posts.`,
        ar: `لقد وصلت إلى الحد الشهري (${BUYER_MONTHLY_LIMIT}) لخطة المشتري.`,
        zh: `您已达到买家计划每月 ${BUYER_MONTHLY_LIMIT} 条广告的上限。`,
        code: 'BUYER_MONTHLY_LIMIT_REACHED',
        upgradeUrl: '/dashboard/subscription',
      });
    }
  }

  // ── getPermissionStatus ───────────────────────────────────────────────────
  // Returns a rich status object for the frontend to display the correct UI.

  async getPermissionStatus(userId: string): Promise<PermissionStatus> {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { role: true, createdAt: true },
    });

    // ADMIN
    if (user.role === 'ADMIN') {
      return { canPost: true, reason: 'ADMIN' };
    }

    // USER (buyer)
    if (user.role === 'USER') {
      return this.getBuyerPermissionStatus(userId);
    }

    // Non-dealer
    if (user.role !== 'DEALER') {
      return { canPost: false, reason: 'NOT_DEALER' };
    }

    // --- DEALER path ---

    // Active subscription?
    const activeSub = await this.prisma.dealerSubscription.findFirst({
      where: {
        dealer:           { userId },
        currentPeriodEnd: { gt: new Date() },
        status:           'ACTIVE',
      },
      orderBy: { currentPeriodEnd: 'desc' },
    });

    if (activeSub) {
      return {
        canPost:         true,
        reason:          'SUBSCRIBED',
        subscriptionEnd: activeSub.currentPeriodEnd ?? undefined,
        plan:            activeSub.plan,
      };
    }

    const trialEnd = this.calcTrialEnd(user.createdAt);
    const now      = new Date();

    if (now > trialEnd) {
      return { canPost: false, reason: 'TRIAL_EXPIRED', trialEnd };
    }

    const trialPostsUsed = await this.prisma.listing.count({
      where: {
        userId,
        status: { in: ACTIVE_STATUSES as unknown as any[] },
      },
    });

    if (trialPostsUsed >= TRIAL_POST_LIMIT) {
      return {
        canPost:             false,
        reason:              'LIMIT_REACHED',
        trialEnd,
        trialPostsUsed,
        trialPostsRemaining: 0,
      };
    }

    return {
      canPost:             true,
      reason:              'TRIAL',
      trialEnd,
      trialPostsUsed,
      trialPostsRemaining: TRIAL_POST_LIMIT - trialPostsUsed,
    };
  }

  // ── getBuyerPermissionStatus ──────────────────────────────────────────────

  private async getBuyerPermissionStatus(userId: string): Promise<PermissionStatus> {
    const buyerSub = await this.prisma.subscription.findFirst({
      where: {
        userId,
        plan:             BUYER_PLAN_ID,
        status:           'active',
        currentPeriodEnd: { gt: new Date() },
      },
    });

    if (!buyerSub) {
      return {
        canPost:          false,
        reason:           'BUYER_NOT_SUBSCRIBED',
        monthlyUsed:      0,
        monthlyLimit:     BUYER_MONTHLY_LIMIT,
        monthlyRemaining: 0,
      };
    }

    const monthlyUsed = await this.getBuyerMonthlyCount(userId);

    if (monthlyUsed >= BUYER_MONTHLY_LIMIT) {
      return {
        canPost:          false,
        reason:           'BUYER_MONTHLY_LIMIT_REACHED',
        plan:             BUYER_PLAN_ID,
        subscriptionEnd:  buyerSub.currentPeriodEnd ?? undefined,
        monthlyUsed,
        monthlyLimit:     BUYER_MONTHLY_LIMIT,
        monthlyRemaining: 0,
      };
    }

    return {
      canPost:          true,
      reason:           'BUYER_SUBSCRIBED',
      plan:             BUYER_PLAN_ID,
      subscriptionEnd:  buyerSub.currentPeriodEnd ?? undefined,
      monthlyUsed,
      monthlyLimit:     BUYER_MONTHLY_LIMIT,
      monthlyRemaining: BUYER_MONTHLY_LIMIT - monthlyUsed,
    };
  }

  // ── Private helpers ───────────────────────────────────────────────────────

  private async getBuyerMonthlyCount(userId: string): Promise<number> {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    return this.prisma.listing.count({
      where: {
        userId,
        createdAt: { gte: startOfMonth },
        deletedAt: null,
      },
    });
  }

  private calcTrialEnd(createdAt: Date): Date {
    const end = new Date(createdAt);
    end.setDate(end.getDate() + TRIAL_DAYS);
    return end;
  }
}
