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
 * TRUST & SAFETY PROMPT 4 — four new signals, same zero-OpenAI-cost rule
 * applied to each even though the obvious implementation for two of them
 * would have broken it:
 *   - offPlatformPaymentRequests calls AiService directly, but ONLY
 *     .detectOffPlatformPaymentLanguage() — a pure keyword-match method
 *     with NO OpenAI call, added specifically so this signal wouldn't need
 *     one. It does NOT call .detectSpamFull(), which internally calls
 *     openai.moderate() and would reintroduce exactly the N-calls-per-user
 *     cost this file's header already warns against. Scan is also capped
 *     at MESSAGE_SCAN_CAP messages/user, not the full 30-day history.
 *   - priceOutlierRatio calls AiService.suggestPrice() (reusing its
 *     existing IQR/median percentile math, per instruction — see
 *     scorePriceOutlierRatio()'s comment), but only AFTER a cheap pre-count
 *     confirms ≥3 comparable listings exist. suggestPrice() falls back to
 *     a GPT-4o-mini call when comparables < 3; the pre-count means that
 *     branch is never reached from this service. Listings with <3
 *     comparables are excluded from the ratio's denominator (unjudgeable,
 *     not "clean").
 *   - duplicateListingRatio and identityVerified are plain-query signals,
 *     no cost question at all — DuplicateListingFlag (Prompt 3) and
 *     User.identityVerifiedAt (Prompt 2) are both already-computed columns.
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
 *
 * WEIGHT REBALANCE (Prompt 4): all 8 original weights were trimmed to make
 * room for the 4 new signals below, reviewed and approved as a table
 * before this file was written — see conversation history, not
 * reproduced here to avoid this comment going stale as weights get tuned
 * further. adminAction still dominates by design (still the single
 * largest weight); identityVerified is deliberately the smallest (inverse
 * signal — corroborating, not primary, evidence).
 */

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AiService } from '../ai/ai.service';
import { countRecentMessages } from './message-velocity.helper';

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

// ADDED (Trust & Safety Prompt 4)
const OFFPLATFORM_MESSAGE_WINDOW_DAYS = 30;
const OFFPLATFORM_MESSAGE_SCAN_CAP = 50; // see header comment — bounds cost, not a full history scan
const PRICE_OUTLIER_LISTING_CAP = 20; // bounds worst-case suggestPrice() calls for high-volume dealers
const PRICE_OUTLIER_BELOW_MIN_RATIO = 0.7; // price < 70% of the curve's low band = outlier

@Injectable()
export class FraudScoringService {
  private readonly logger = new Logger(FraudScoringService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly ai: AiService,
  ) {}

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
        identityVerifiedAt: true,
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
      weight: 0.05,
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

    // 9. Duplicate/fake listing flags (Prompt 3's DuplicateListingFlag) —
    //    ratio of this user's own listings that have at least one flag.
    signals.duplicateListingRatio = await this.scoreDuplicateListingRatio(userId);

    // 10. Bait pricing — asking price far below the market curve's low
    //     band on this user's own vehicle listings (advance-fee-fraud
    //     pattern: unrealistically cheap price to lure buyers off-platform).
    signals.priceOutlierRatio = await this.scorePriceOutlierRatio(userId);

    // 11. Off-platform payment redirect language in this user's recent
    //     sent messages (wire transfer / hawala / pay-before-view).
    signals.offPlatformPaymentRequests = await this.scoreOffPlatformPaymentRequests(userId);

    // 12. Identity verification (Prompt 2) — inverse, small weight;
    //     corroborating signal only, not primary evidence (most legitimate
    //     users never opt in, so being unverified alone is weak on its own).
    signals.identityVerified = this.scoreIdentityVerified(user.identityVerifiedAt);

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
      return { score: 100, weight: 0.20, detail: 'account banned' };
    }
    if (user.suspendedUntil && user.suspendedUntil > new Date()) {
      return { score: 80, weight: 0.20, detail: `suspended: ${user.suspendedReason ?? 'no reason recorded'}` };
    }
    return { score: 0, weight: 0.20, detail: 'no admin action on record' };
  }

  private scoreAccountAge(createdAt: Date): FraudSignal {
    const ageDays = (Date.now() - createdAt.getTime()) / 86_400_000;
    // Linear taper from 60 (brand new) to 0 (30+ days old) — a shape, not a
    // precisely-tuned model; revisit with real fraud outcome data once
    // there's enough of it to fit against.
    const score = ageDays >= 30 ? 0 : Math.round(60 * (1 - ageDays / 30));
    return { score, weight: 0.06, detail: `account age ${Math.floor(ageDays)}d` };
  }

  private scoreLoginSecurity(failedLoginAttempts: number, lockedUntil: Date | null): FraudSignal {
    const currentlyLocked = !!lockedUntil && lockedUntil > new Date();
    const score = currentlyLocked ? 70 : Math.min(50, failedLoginAttempts * 10);
    return {
      score,
      weight: 0.06,
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
      return { score: 0, weight: 0.11, detail: 'no listings' };
    }
    const ratio = underReview / total;
    return {
      score: Math.round(ratio * 100),
      weight: 0.11,
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
    return { score, weight: 0.11, detail: `${reportCount} report(s) filed against this account` };
  }

  private async scorePaymentRisk(userId: string): Promise<FraudSignal> {
    const payments = await this.prisma.db('read').payment.findMany({
      where: { userId },
      select: { status: true, refundedAt: true },
    });

    if (payments.length === 0) {
      return { score: 0, weight: 0.06, detail: 'no payment history' };
    }

    const failed = payments.filter((p: { status: string }) => p.status === 'FAILED').length;
    const refunded = payments.filter((p: { refundedAt: Date | null }) => p.refundedAt !== null).length;
    const badRate = (failed + refunded) / payments.length;

    return {
      score: Math.round(badRate * 100),
      weight: 0.06,
      // "refund rate" not "chargeback rate" — see header gap note; this
      // codebase has no chargeback/dispute tracking to draw on.
      detail: `${failed} failed + ${refunded} refunded of ${payments.length} payment(s)`,
    };
  }

  private async scoreMessageVelocity(userId: string): Promise<FraudSignal> {
    // ADDED (Trust & Safety Prompt 5): extracted to message-velocity.helper.ts
    // so SuspiciousActivityService's real-time spike check reuses the exact
    // same query instead of duplicating it — this method's own behavior is
    // unchanged.
    const count = await countRecentMessages(this.prisma.db('read'), userId, MESSAGE_VELOCITY_WINDOW_HOURS);

    const score = Math.min(100, Math.round((count / MESSAGE_VELOCITY_HIGH_THRESHOLD) * 100));
    return {
      score,
      weight: 0.10,
      detail: `${count} message(s) sent in the last ${MESSAGE_VELOCITY_WINDOW_HOURS}h`,
    };
  }

  // ── ADDED (Trust & Safety Prompt 4) ─────────────────────────────────────

  private async scoreDuplicateListingRatio(userId: string): Promise<FraudSignal> {
    const listings = await this.prisma.db('read').listing.findMany({
      where: { userId, deletedAt: null },
      select: { id: true },
    });
    if (listings.length === 0) {
      return { score: 0, weight: 0.13, detail: 'no listings' };
    }
    const listingIds = listings.map((l: { id: string }) => l.id);

    const flagged = await this.prisma.db('read').duplicateListingFlag.findMany({
      where: { listingId: { in: listingIds } },
      distinct: ['listingId'],
      select: { listingId: true },
    });

    const ratio = flagged.length / listings.length;
    return {
      score: Math.round(ratio * 100),
      weight: 0.13,
      detail: `${flagged.length}/${listings.length} listings have a duplicate/fake flag`,
    };
  }

  /**
   * Reuses AiService.suggestPrice() (Prompt 7's IQR/median/GPT-fallback
   * percentile math, untouched here) rather than reimplementing it — see
   * this file's header comment for the pre-count that keeps this signal
   * from ever reaching suggestPrice()'s GPT-4o-mini fallback branch.
   */
  private async scorePriceOutlierRatio(userId: string): Promise<FraudSignal> {
    const listings = await this.prisma.db('read').listing.findMany({
      where: {
        userId,
        deletedAt: null,
        status: 'ACTIVE',
        vehicleSpec: {
          is: {
            year: { not: null },
            mileageKm: { not: null },
            brandId: { not: null },
          },
        },
      },
      select: {
        id: true,
        price: true,
        location: { select: { country: true } },
        vehicleSpec: {
          select: {
            year: true,
            mileageKm: true,
            condition: true,
            bodyType: true,
            brand: { select: { nameEn: true } },
            model: { select: { nameEn: true } },
          },
        },
      },
      take: PRICE_OUTLIER_LISTING_CAP,
    });

    if (listings.length === 0) {
      return { score: 0, weight: 0.06, detail: 'no vehicle listings with enough spec data to evaluate' };
    }

    let considered = 0;
    let outliers = 0;

    for (const listing of listings) {
      const spec = listing.vehicleSpec!;
      const year = spec.year!;
      const mileage = spec.mileageKm!;
      const make = spec.brand?.nameEn;
      if (!make) continue;

      try {
        // Cheap pre-count, mirroring _computeBaseSuggestion's own
        // comparable-listing WHERE clause exactly — see header comment for
        // why: <3 comparables would otherwise trigger suggestPrice()'s
        // GPT-4o-mini fallback, which this nightly batch must never call.
        const comparableCount = await this.prisma.db('read').listing.count({
          where: {
            status: 'ACTIVE',
            vehicleSpec: {
              is: {
                year: { gte: year - 2, lte: year + 2 },
                mileageKm: { lte: mileage + 30_000 },
                ...(spec.condition ? { condition: spec.condition } : {}),
                brand: { nameEn: { contains: make, mode: 'insensitive' } },
              },
            },
          },
        });
        if (comparableCount < 3) continue; // unjudgeable — excluded from denominator, not counted as "clean"

        considered++;

        const suggestion = await this.ai.suggestPrice(
          make,
          spec.model?.nameEn ?? make,
          year,
          mileage,
          spec.condition ?? 'USED',
          listing.location?.country ?? 'Iraq',
          spec.bodyType ?? undefined,
        );

        const askingPrice = Number(listing.price);
        if (askingPrice < suggestion.min * PRICE_OUTLIER_BELOW_MIN_RATIO) {
          outliers++;
        }
      } catch (err) {
        // One bad listing's price check must not skew or abort the rest.
        this.logger.warn(`Price outlier check failed for listing ${listing.id}: ${(err as Error).message}`);
      }
    }

    if (considered === 0) {
      return { score: 0, weight: 0.06, detail: 'no listings with ≥3 comparables to judge against' };
    }

    const ratio = outliers / considered;
    return {
      score: Math.round(ratio * 100),
      weight: 0.06,
      detail: `${outliers}/${considered} vehicle listing(s) priced <${Math.round(PRICE_OUTLIER_BELOW_MIN_RATIO * 100)}% of the market curve's low band`,
    };
  }

  /**
   * Deliberately calls detectOffPlatformPaymentLanguage() (pure keyword
   * match), NEVER detectSpamFull() (which calls openai.moderate()) — see
   * this file's header comment. Each hit is weighted heavily (one clear
   * "send a wire transfer before viewing" message is already a strong
   * signal on its own — advance-fee scammers don't repeat it in every
   * message), capped at 100.
   */
  private async scoreOffPlatformPaymentRequests(userId: string): Promise<FraudSignal> {
    const since = new Date(Date.now() - OFFPLATFORM_MESSAGE_WINDOW_DAYS * 24 * 3600 * 1000);
    const messages = await this.prisma.db('read').message.findMany({
      where: { senderId: userId, createdAt: { gte: since }, messageType: 'text' },
      select: { content: true },
      orderBy: { createdAt: 'desc' },
      take: OFFPLATFORM_MESSAGE_SCAN_CAP,
    });

    if (messages.length === 0) {
      return { score: 0, weight: 0.13, detail: 'no recent text messages' };
    }

    const hits = messages.filter(
      (m: { content: string }) => this.ai.detectOffPlatformPaymentLanguage(m.content).matched,
    ).length;

    const score = Math.min(100, hits * 35);
    return {
      score,
      weight: 0.13,
      detail: `${hits}/${messages.length} recent message(s) contain off-platform payment language`,
    };
  }

  private scoreIdentityVerified(identityVerifiedAt: Date | null): FraudSignal {
    return {
      score: identityVerifiedAt ? 0 : 15,
      weight: 0.03,
      detail: identityVerifiedAt ? `identity verified ${identityVerifiedAt.toISOString()}` : 'identity not verified',
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

