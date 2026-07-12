/**
 * apps/api/src/common/trust/trust-score.util.ts
 *
 * Trust & Safety Prompt 6 — public TrustScore (0-100), computed on demand
 * in the listing/profile response DTOs, per instruction ("do not persist a
 * new table unless a query-performance need shows up"). Pure function, no
 * DB access — callers (listings.service.ts's findOne(), users.service.ts's
 * findByIdPublic()) fetch the four inputs via whatever query shape they
 * already have, this just does the math, so it's trivially testable and
 * reused identically by both call sites without either depending on the
 * other's query structure.
 *
 * ⚠️ CALLER RESPONSIBILITY: `fraudOverallRisk` comes from FraudScore, an
 * admin-only signal (account bans/suspicions, report counts, etc. — see
 * fraud-scoring.service.ts). This function folds it into a single 0-100
 * output number and nothing else about it is returned — but it is the
 * CALLER's job to never separately select/return raw FraudScore fields
 * (overallRisk, signals) anywhere in a public response. This file has no
 * way to enforce that; it's flagged here because it's the single most
 * likely accidental data leak this feature could introduce.
 *
 * WEIGHTS (tunable, not derived from any specification — reviewed choice,
 * same spirit as fraud-scoring.service.ts's weight table):
 *   - sellerScore   0.40 — the most comprehensive existing signal
 *     (listing quality + price competitiveness + report rate already
 *     rolled in — see SellerScore's own computation).
 *   - fraud         0.30 — integrity check; inverted (100 - risk).
 *   - reviews       0.20 — social proof, Bayesian-damped (see
 *     REVIEW_CONFIDENCE_PRIOR_COUNT below) so 1 five-star review doesn't
 *     outrank a seller with 200 reviews averaging 4.6.
 *   - identity      0.10 — smallest; a verified ID is a credential check,
 *     not a behavioral signal, same "corroborating not primary" reasoning
 *     as FraudScoringService's identityVerified signal.
 * Sums to 1.0 exactly (unlike the fraud weight table, there's no
 * adminAction-style dominant signal here that needs disproportionate
 * headroom, so a clean sum-to-1.0 was possible and kept for readability).
 */

const WEIGHT_SELLER_SCORE = 0.40;
const WEIGHT_FRAUD = 0.30;
const WEIGHT_REVIEWS = 0.20;
const WEIGHT_IDENTITY = 0.10;

// Defaults applied when a user has no SellerScore/FraudScore row yet
// (brand-new account, nightly job hasn't run for them yet, or — for
// FraudScore — genuinely no signals to compute from). Deliberately
// "cautiously neutral," not 0 and not 100: a brand-new seller shouldn't
// look either maximally trustworthy or maximally suspicious before any
// data exists.
const DEFAULT_SELLER_SCORE = 50;
const DEFAULT_FRAUD_RISK = 30;

// Bayesian damping for the review-count component: pulls a small review
// sample toward NEUTRAL_RATING_SCORE rather than letting 1-2 reviews swing
// the score to an extreme. Effectively "you need ~5 reviews' worth of
// weight before your own average dominates."
const REVIEW_CONFIDENCE_PRIOR_COUNT = 5;
const NEUTRAL_RATING_SCORE = 65; // out of 100 — mild positive prior, not neutral-50

export interface TrustScoreInput {
  sellerScoreOverall: number | null; // SellerScore.overallScore (0-100), null if no row yet
  identityVerified: boolean; // User.identityVerifiedAt !== null
  avgRating: number | null; // average of Review.rating (1-5) received, null if zero reviews
  reviewCount: number;
  fraudOverallRisk: number | null; // FraudScore.overallRisk (0-100), null if no row yet — NEVER return this raw value in a public response, see file header
}

export function computeTrustScore(input: TrustScoreInput): number {
  const sellerComponent = input.sellerScoreOverall ?? DEFAULT_SELLER_SCORE;
  const fraudComponent = 100 - (input.fraudOverallRisk ?? DEFAULT_FRAUD_RISK);

  const rawRatingScore =
    input.avgRating !== null ? ((input.avgRating - 1) / 4) * 100 : NEUTRAL_RATING_SCORE;
  const reviewComponent =
    (input.reviewCount * rawRatingScore + REVIEW_CONFIDENCE_PRIOR_COUNT * NEUTRAL_RATING_SCORE) /
    (input.reviewCount + REVIEW_CONFIDENCE_PRIOR_COUNT);

  const identityComponent = input.identityVerified ? 100 : 50;

  const weighted =
    sellerComponent * WEIGHT_SELLER_SCORE +
    fraudComponent * WEIGHT_FRAUD +
    reviewComponent * WEIGHT_REVIEWS +
    identityComponent * WEIGHT_IDENTITY;

  return Math.max(0, Math.min(100, Math.round(weighted)));
}
