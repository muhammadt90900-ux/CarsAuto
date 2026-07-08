/**
 * apps/api/src/modules/fraud/fraud-scoring.service.ts
 *
 * Prompt 4 — Account Risk Scoring (Layers 2-4: no OpenAI calls in the
 * scoring path itself — every signal below comes from data this codebase
 * already stores, computed with plain queries/aggregates).
 *
 * WHY NO OPENAI CALLS: the obvious signal to reach for is "re-run spam
 * detection on the user's listings," but AiService.checkContent() already
 * runs at listing-creation time and its result is persisted as
 * Listing.status = 'UNDER_REVIEW' — re-deriving it nightly for every
 * active user's listings would mean N moderation calls per user, for
 * information already sitting in a column. This service counts
 * UNDER_REVIEW listings instead; zero LLM cost, same signal.
 *
 * KNOWN GAPS — deliberately NOT worked around, flagged instead:
 *   - No IP address is stored anywhere (User, Payment, TransactionLog all
 *     lack one) — so there's no IP-velocity or IP-mismatch signal here.
 *     Adding one would mean either a new column + capture point on
 *     login/payment (a real schema + auth-flow change) or pulling it from
 *     request logs outside Postgres — out of scope for a scoring service
 *     to invent silently.
 *   - No chargeback/dispute model exists — Payment/TransactionLog track
 *     refunds (refundedAt/refundAmount) but not gateway-reported disputes.
 *     Refund rate is used as a partial proxy below; it is NOT the same
 *     signal as a chargeback rate and shouldn't be presented to admins as
 *     one.
 * Both are easy additive follow-ups once you decide they're worth the
 * schema change — this service is written so a new signal is just another
 * entry in the `signals` object and a line in `computeOverallRisk()`.
 */

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

export interface FraudSignal {
  score: number; // 0-100 contribution before weighting
  weight: number;
  detail: string;
}

export interface FraudScoreResult {
  userId: string;
  overallRisk: number;
  signals: Record<string, FraudSignal>;
}

const MESSAGE_VELOCITY_WINDOW_HOURS = 24;
const MESSAGE_VELOCITY_HIGH_THRESHOLD = 100; // messages/24h considered spam-velocity

@Injectable()
export class FraudScoringService {
  private readonly logger = new Logger(FraudScoringService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Computes and PERSISTS (upserts FraudScore) the risk score for one user.
   * Never throws — a signal query failing degrades that signal to 0 rather
   * than failing the whole score (this is called from a nightly batch;
   * one bad row must not abort the batch).
   */
  async scoreAccount(userId: string): Promise<FraudScoreResult> {
    const signals: Record<string, FraudSignal> = {};

    const user = await this.prisma.db('read').user.findUnique({
      where: { id: userId },
      select: {
        createdAt: true,
        verified: true,
        failedLoginAttempts: true,
        lockedUntil: true,
        banned: true,
        suspendedUntil: true,
        suspendedReason: true,
      },
    });

    if (!user) {
      return { userId, overallRisk: 0, signals: {} };
    }

    // 1. Admin action already taken — this alone should dominate the score.
    signals.adminAction = this.scoreAdminAction(user);

    // 2. Account age — brand-new accounts are statistically riskier
    //    (established scam pattern: create account, list, collect payment, vanish).
    signals.accountAge = this.scoreAccountAge(user.createdAt);

    // 3. Email verification.
    signals.emailVerified = {
      score: user.verified ? 0 : 40,
      weight: 0.10,
      detail: user.verified ? 'email verified' : 'email not verified',
    };

    // 4. Recent lockout / failed logins — brute-force target or credential stuffing source.
    signals.loginSecurity = this.scoreLoginSecurity(user.failedLoginAttempts, user.lockedUntil);

    // 5. Listing spam ratio (reuses Listing.status, no new LLM calls — see header).
    signals.listingSpamRatio = await this.scoreListingSpamRatio(userId);

    // 6. Reports filed against this user directly.
    signals.userReports = await this.scoreUserReports(userId);

    // 7. Payment failure / refund rate (partial proxy for payment risk — see header gap note).
    signals.paymentRisk = await this.scorePaymentRisk(userId);

    // 8. Chat message velocity — spam/abuse-bot pattern.
    signals.messageVelocity = await this.scoreMessageVelocity(userId);

    const overallRisk = this.computeOverallRisk(signals);

    await this.persist(userId, overallRisk, signals);

    return { userId, overallRisk, signals };
  }

  private computeOverallRisk(signals: Record<string, FraudSignal>): number {
    let weighted = 0;
    let totalWeight = 0;
    for (const s of Object.values(signals)) {
      weighted += s.score * s.weight;
      totalWeight += s.weight;
    }
    const normalized = totalWeight > 0 ? weighted / totalWeight : 0;
    return Math.max(0, Math.min(100, Math.round(normalized)));
  }

  private scoreAdminAction(user: {
    banned: boolean;
    suspendedUntil: Date | null;
    suspendedReason: string | null;
  }): FraudSignal {
    if (user.banned) {
      return { score: 100, weight: 0.25, detail: 'account banned' };
    }
    if (user.suspendedUntil && user.suspendedUntil > new Date()) {
      return { score: 80, weight: 0.25, detail: `suspended: ${user.suspendedReason ?? 'no reason recorded'}` };
    }
    return { score: 0, weight: 0.25, detail: 'no admin action on record' };
  }

  private scoreAccountAge(createdAt: Date): FraudSignal {
    const ageDays = (Date.now() - createdAt.getTime()) / 86_400_000;
    // Linear taper from 60 (brand new) to 0 (30+ days old) — a shape, not a
    // precisely-tuned model; revisit with real fraud outcome data once
    // there's enough of it to fit against.
    const score = ageDays >= 30 ? 0 : Math.round(60 * (1 - ageDays / 30));
    return { score, weight: 0.10, detail: `account age ${Math.floor(ageDays)}d` };
  }

  private scoreLoginSecurity(failedLoginAttempts: number, lockedUntil: Date | null): FraudSignal {
    const currentlyLocked = !!lockedUntil && lockedUntil > new Date();
    const score = currentlyLocked ? 70 : Math.min(50, failedLoginAttempts * 10);
    return {
      score,
      weight: 0.10,
      detail: currentlyLocked
        ? `currently locked out until ${lockedUntil!.toISOString()}`
        : `${failedLoginAttempts} failed login attempt(s)`,
    };
  }

  private async scoreListingSpamRatio(userId: string): Promise<FraudSignal> {
    const [total, underReview] = await Promise.all([
      this.prisma.db('read').listing.count({ where: { userId, deletedAt: null } }),
      this.prisma.db('read').listing.count({ where: { userId, deletedAt: null, status: 'UNDER_REVIEW' } }),
    ]);

    if (total === 0) {
      return { score: 0, weight: 0.15, detail: 'no listings' };
    }
    const ratio = underReview / total;
    return {
      score: Math.round(ratio * 100),
      weight: 0.15,
      detail: `${underReview}/${total} listings flagged UNDER_REVIEW`,
    };
  }

  private async scoreUserReports(userId: string): Promise<FraudSignal> {
    // NOTE: this codebase's Report.targetType casing is inconsistent across
    // call sites ('USER' in admin.service.ts's counter, 'User' elsewhere) —
    // pre-existing data-quality issue, not introduced here. Matching
    // admin.service.ts's own counter query (targetType: 'USER') since
    // that's the established "count of reports against a user" query.
    const reportCount = await this.prisma.db('read').report.count({
      where: { targetType: 'USER', targetId: userId },
    });

    const score = Math.min(100, reportCount * 20);
    return { score, weight: 0.15, detail: `${reportCount} report(s) filed against this account` };
  }

  private async scorePaymentRisk(userId: string): Promise<FraudSignal> {
    const payments = await this.prisma.db('read').payment.findMany({
      where: { userId },
      select: { status: true, refundedAt: true },
    });

    if (payments.length === 0) {
      return { score: 0, weight: 0.10, detail: 'no payment history' };
    }

    const failed = payments.filter((p: { status: string }) => p.status === 'FAILED').length;
    const refunded = payments.filter((p: { refundedAt: Date | null }) => p.refundedAt !== null).length;
    const badRate = (failed + refunded) / payments.length;

    return {
      score: Math.round(badRate * 100),
      weight: 0.10,
      // "refund rate" not "chargeback rate" — see header gap note; this
      // codebase has no chargeback/dispute tracking to draw on.
      detail: `${failed} failed + ${refunded} refunded of ${payments.length} payment(s)`,
    };
  }

  private async scoreMessageVelocity(userId: string): Promise<FraudSignal> {
    const since = new Date(Date.now() - MESSAGE_VELOCITY_WINDOW_HOURS * 3600 * 1000);
    const count = await this.prisma.db('read').message.count({
      where: { senderId: userId, createdAt: { gte: since } },
    });

    const score = Math.min(100, Math.round((count / MESSAGE_VELOCITY_HIGH_THRESHOLD) * 100));
    return {
      score,
      weight: 0.15,
      detail: `${count} message(s) sent in the last ${MESSAGE_VELOCITY_WINDOW_HOURS}h`,
    };
  }

  private async persist(userId: string, overallRisk: number, signals: Record<string, FraudSignal>): Promise<void> {
    try {
      await this.prisma.fraudScore.upsert({
        where: { userId },
        create: { userId, overallRisk, signals: signals as any, computedAt: new Date() },
        update: { overallRisk, signals: signals as any, computedAt: new Date() },
      });
    } catch (err) {
      this.logger.warn(`Failed to persist FraudScore for user ${userId}: ${(err as Error).message}`);
    }
  }
}

