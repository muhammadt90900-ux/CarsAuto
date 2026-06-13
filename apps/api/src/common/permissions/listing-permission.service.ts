// apps/api/src/common/permissions/listing-permission.service.ts
//
// Single source of truth for "can this user create a listing?"
// Called by ListingsController.create() and UploadController endpoints.
// Also exposes getPermissionStatus() for the frontend status endpoint.

import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

// ── Constants ─────────────────────────────────────────────────────────────────
const TRIAL_DAYS          = 30;
const TRIAL_POST_LIMIT    = 50;

// Listing statuses that count toward the trial cap
const ACTIVE_STATUSES = ['ACTIVE', 'DRAFT', 'PENDING', 'SOLD'] as const;

export type PermissionReason =
  | 'ADMIN'
  | 'SUBSCRIBED'
  | 'TRIAL'
  | 'TRIAL_EXPIRED'
  | 'LIMIT_REACHED'
  | 'NOT_DEALER';

export interface PermissionStatus {
  canPost: boolean;
  reason: PermissionReason;
  trialEnd?: Date;
  trialPostsUsed?: number;
  trialPostsRemaining?: number;
  subscriptionEnd?: Date;
  plan?: string;
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

    // 2. Non-DEALER — blocked
    if (user.role !== 'DEALER') {
      throw new ForbiddenException({
        ku: 'تەنها فرۆشیار دەتوانێت ئۆگهێل بدات',
        en: 'Only dealers can create listings',
        code: 'ROLE_NOT_DEALER',
      });
    }

    // 3. Check for an active subscription (endDate in the future)
    const activeSub = await this.prisma.userDealerSubscription.findFirst({
      where: { userId, endDate: { gt: new Date() } },
      orderBy: { endDate: 'desc' },
    });

    if (activeSub) return; // subscribed → unlimited

    // 4. Trial window check
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

    // 5. Within trial — check post count
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

    // 6. Within trial and under limit → allowed
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

    // Non-dealer
    if (user.role !== 'DEALER') {
      return { canPost: false, reason: 'NOT_DEALER' };
    }

    // Active subscription?
    const activeSub = await this.prisma.userealerSubscription.findFirst({
      where: { userId, endDate: { gt: new Date() } },
      orderBy: { endDate: 'desc' },
    });

    if (activeSub) {
      return {
        canPost:         true,
        reason:          'SUBSCRIBED',
        subscriptionEnd: activeSub.endDate,
        plan:            activeSub.plan,
      };
    }

    const trialEnd = this.calcTrialEnd(user.createdAt);
    const now      = new Date();

    // Trial expired, no subscription
    if (now > trialEnd) {
      return { canPost: false, reason: 'TRIAL_EXPIRED', trialEnd };
    }

    // Within trial — count posts
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

  // ── Private helpers ───────────────────────────────────────────────────────

  private calcTrialEnd(createdAt: Date): Date {
    const end = new Date(createdAt);
    end.setDate(end.getDate() + TRIAL_DAYS);
    return end;
  }
}
