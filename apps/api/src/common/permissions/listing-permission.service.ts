// apps/api/src/common/permissions/listing-permission.service.ts
//
// Single source of truth for "can this user create a listing?"
// Called by ListingsController.create() and UploadController endpoints.
// Also exposes getPermissionStatus() for the frontend status endpoint.
//
// ── Role behaviour ───────────────────────────────────────────────────────────
//   ADMIN  → always allowed
//   DEALER → 30-day trial (50 posts) then paid Subscription (BASIC/PREMIUM/
//            ENTERPRISE), each with its own listing cap — see PLAN_MAX_LISTINGS.
//   USER   → must have active Subscription with plan='BUYER' ($2.99/month)
//            capped at BUYER_MONTHLY_LIMIT (2) listings per calendar month
//
// BUG FIX: the DEALER branch used to check `this.prisma.dealerSubscription`
// — a table that real dealer payments (PaymentsService.upsertSubscription,
// used by every non-Stripe gateway: ZainCash/FastPay/AsiaHawala) never
// wrote to. A dealer who actually paid still got blocked once their trial
// ran out, because their paid status lived in `Subscription`, not
// `DealerSubscription`. Now checks `Subscription` — the table that's
// actually written on payment confirmation — and enforces a real per-plan
// listing cap (previously any active subscription meant fully unlimited
// listings regardless of tier, so a $10 Basic subscriber and an $89
// Enterprise subscriber got identical access).

import { Injectable, ForbiddenException } from '@nestjs/common';
import { UserSubscriptionPlan, UserSubscriptionStatus, SubscriptionPlan, SubscriptionStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

// ── Constants ─────────────────────────────────────────────────────────────────
const TRIAL_DAYS         = 30;
const TRIAL_POST_LIMIT   = 50;
const BUYER_MONTHLY_LIMIT = 2;

// Listing cap per paid dealer plan. null = unlimited.
const DEALER_PLAN_MAX_LISTINGS: Partial<Record<UserSubscriptionPlan, number | null>> = {
  [UserSubscriptionPlan.BASIC]:      30,
  [UserSubscriptionPlan.PREMIUM]:    200,
  [UserSubscriptionPlan.ENTERPRISE]: null,
};

// Listing cap for premium time earned via the Referral Program (writes to
// the separate `DealerSubscription` model — see
// ReferralsService.grantPremiumMonths). STARTER/BUSINESS mirror the paid
// BASIC/PREMIUM caps above so a referral-earned reward is worth the same
// as the equivalent paid tier; FREE never grants access on its own.
const REFERRAL_PLAN_MAX_LISTINGS: Partial<Record<SubscriptionPlan, number | null>> = {
  [SubscriptionPlan.STARTER]:  30,
  [SubscriptionPlan.BUSINESS]: 200,
  [SubscriptionPlan.ENTERPRISE]: null,
};
const BUYER_PLAN_ID      = UserSubscriptionPlan.BUYER;

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

  // ── getActiveDealerAccess ────────────────────────────────────────────────
  // A dealer can be premium two ways that both need to count: paid via
  // PaymentsService (writes `Subscription`) or earned via the Referral
  // Program (writes `DealerSubscription` — see ReferralsService.
  // grantPremiumMonths). Neither source knows about the other, so this
  // checks both and returns the more generous cap — a dealer who's paying
  // for Basic *and* earned a referral reward shouldn't be capped at the
  // lower of the two.
  private async getActiveDealerAccess(userId: string): Promise<{ maxListings: number | null; periodEnd: Date | null } | null> {
    const now = new Date();

    const [paidSub, referralSub] = await Promise.all([
      this.prisma.subscription.findFirst({
        where: {
          userId,
          status:           UserSubscriptionStatus.ACTIVE,
          currentPeriodEnd: { gt: now },
          plan:             { in: [UserSubscriptionPlan.BASIC, UserSubscriptionPlan.PREMIUM, UserSubscriptionPlan.ENTERPRISE] },
        },
        orderBy: { currentPeriodEnd: 'desc' },
      }),
      this.prisma.dealerSubscription.findFirst({
        where: {
          dealer:           { userId },
          status:           SubscriptionStatus.ACTIVE,
          currentPeriodEnd: { gt: now },
          plan:             { in: [SubscriptionPlan.STARTER, SubscriptionPlan.BUSINESS, SubscriptionPlan.ENTERPRISE] },
        },
        orderBy: { currentPeriodEnd: 'desc' },
      }),
    ]);

    if (!paidSub && !referralSub) return null;

    const paidCap     = paidSub     ? (DEALER_PLAN_MAX_LISTINGS[paidSub.plan] ?? null)     : undefined;
    const referralCap = referralSub ? (REFERRAL_PLAN_MAX_LISTINGS[referralSub.plan] ?? null) : undefined;

    // null = unlimited, and unlimited from either source wins outright.
    const caps = [paidCap, referralCap].filter((c) => c !== undefined) as (number | null)[];
    const maxListings = caps.includes(null) ? null : Math.max(...(caps as number[]));

    const periodEnd = [paidSub?.currentPeriodEnd, referralSub?.currentPeriodEnd]
      .filter((d): d is Date => !!d)
      .sort((a, b) => b.getTime() - a.getTime())[0] ?? null;

    return { maxListings, periodEnd };
  }

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

    // 4. DEALER path: combines paid Subscription (PaymentsService) and
    // referral-earned DealerSubscription (ReferralsService) — see
    // getActiveDealerAccess for why both need checking.
    const access = await this.getActiveDealerAccess(userId);

    if (access) {
      if (access.maxListings == null) return; // unlimited

      const activeCount = await this.prisma.listing.count({
        where: { userId, status: { in: ACTIVE_STATUSES as unknown as any[] } },
      });

      if (activeCount >= access.maxListings) {
        throw new ForbiddenException({
          ku: `گەیشتیتە سنووری ${access.maxListings} ئەلانی پلانەکەت، تکایە بەرزی بکەرەوە`,
          en: `You have reached the ${access.maxListings}-listing limit for your plan. Upgrade for more.`,
          code: 'PLAN_LIMIT_REACHED',
          upgradeUrl: '/dashboard/subscription',
        });
      }
      return; // subscribed and under cap
    }

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
        status:           UserSubscriptionStatus.ACTIVE,
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

    // Combines paid Subscription and referral-earned DealerSubscription —
    // same helper checkCanPost uses, so the status banner always agrees
    // with what checkCanPost will actually allow.
    const access = await this.getActiveDealerAccess(userId);

    if (access) {
      if (access.maxListings == null) {
        return {
          canPost:         true,
          reason:          'SUBSCRIBED',
          subscriptionEnd: access.periodEnd ?? undefined,
        };
      }
      const activeCount = await this.prisma.listing.count({
        where: { userId, status: { in: ACTIVE_STATUSES as unknown as any[] } },
      });
      return {
        canPost:             activeCount < access.maxListings,
        reason:              activeCount < access.maxListings ? 'SUBSCRIBED' : 'LIMIT_REACHED',
        subscriptionEnd:     access.periodEnd ?? undefined,
        trialPostsUsed:      activeCount,
        trialPostsRemaining: Math.max(0, access.maxListings - activeCount),
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
        status:           UserSubscriptionStatus.ACTIVE,
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
