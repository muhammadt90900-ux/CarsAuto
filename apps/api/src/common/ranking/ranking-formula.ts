// apps/api/src/common/ranking/ranking-formula.ts
//
// Search Architecture Phase 4: the multi-factor ranking score formula.
// Deliberately a PURE function — no Prisma, no I/O — so both apps/worker
// (which recomputes and persists it, nightly + on create/update) and
// apps/api (which only needs to *explain* a score for the admin debug
// endpoint, never persists it) can call the exact same math without one
// side depending on the other's NestJS DI graph. apps/api's copy at
// apps/api/src/common/ranking/ranking-formula.ts is a deliberate
// duplicate — same convention already used for MeilisearchService /
// TranslationProcessor (see those files' header comments). Keep both in
// sync if this formula changes.
//
// ── THE FORMULA ────────────────────────────────────────────────────────────
// rankingScore = freshnessScore × featuredMultiplier × dealerMultiplier × ctrMultiplier
//
// freshnessScore: exponential decay from createdAt, half-life
//   FRESHNESS_HALF_LIFE_DAYS — a listing exactly that many days old scores
//   0.5, twice that old scores 0.25, etc. Floored at FRESHNESS_FLOOR so a
//   very old but still-ACTIVE listing doesn't decay all the way to
//   "invisible" — it should still be findable by direct search/filter, just
//   not favored by default ordering.
//
// featuredMultiplier: FEATURED_BOOST if featured=true AND featuredUntil is
//   still in the future, else 1.0 (no boost, not a penalty).
//
// dealerMultiplier: DEALER_VERIFIED_BOOST if the listing's dealer has a
//   non-null verifiedAt, else 1.0.
//
// ctrMultiplier: only applied once a listing has at least
//   CTR_MIN_IMPRESSIONS impressions in the trailing CTR_WINDOW_DAYS (below
//   that, the sample is too small to trust — a single lucky click on 2
//   impressions is 50% CTR and would otherwise blow past the cap). Above
//   that threshold: ctr = clicks / impressions, compared against an assumed
//   catalog-average CTR_BASELINE, then clamped to
//   [CTR_BOOST_FLOOR, CTR_BOOST_CAP] so neither a cold-start nor a viral
//   listing can runaway-dominate ordering.
//
// ALL FIVE NUMERIC CONSTANTS BELOW ARE FIRST-PASS ESTIMATES, NOT MEASURED
// FROM PRODUCTION DATA — expect to retune after a few weeks of real
// search_events/search_clicks volume. That's exactly why they're named
// constants here and not inlined.

export const FRESHNESS_HALF_LIFE_DAYS = 14;
export const FRESHNESS_FLOOR          = 0.05;

export const FEATURED_BOOST           = 1.8;
export const DEALER_VERIFIED_BOOST    = 1.3;

export const CTR_WINDOW_DAYS          = 14;
export const CTR_MIN_IMPRESSIONS      = 20;   // below this, no CTR adjustment at all
export const CTR_BASELINE             = 0.05; // assumed catalog-average CTR
export const CTR_BOOST_CAP            = 1.5;
export const CTR_BOOST_FLOOR          = 0.7;  // a badly-underperforming listing is dampened, not zeroed

export interface RankingInputs {
  createdAt: Date;
  featured: boolean;
  featuredUntil: Date | null;
  dealerVerified: boolean;
  /** Impressions over the trailing CTR_WINDOW_DAYS — from SearchEvent.resultListingIds. */
  impressions: number;
  /** Clicks over the trailing CTR_WINDOW_DAYS — from SearchClick. */
  clicks: number;
  /** Injectable for tests; defaults to the real current time. */
  now?: Date;
}

export interface RankingBreakdown {
  freshnessScore: number;
  featuredMultiplier: number;
  dealerMultiplier: number;
  ctrMultiplier: number;
  /** null when there weren't enough impressions to compute a trustworthy CTR. */
  ctr: number | null;
  finalScore: number;
}

export function computeRankingScore(input: RankingInputs): RankingBreakdown {
  const now = input.now ?? new Date();

  const ageDays = Math.max(0, (now.getTime() - input.createdAt.getTime()) / 86_400_000);
  const freshnessScore = Math.max(FRESHNESS_FLOOR, Math.pow(0.5, ageDays / FRESHNESS_HALF_LIFE_DAYS));

  const featuredMultiplier =
    input.featured && input.featuredUntil != null && input.featuredUntil > now
      ? FEATURED_BOOST
      : 1.0;

  const dealerMultiplier = input.dealerVerified ? DEALER_VERIFIED_BOOST : 1.0;

  let ctr: number | null = null;
  let ctrMultiplier = 1.0;
  if (input.impressions >= CTR_MIN_IMPRESSIONS) {
    ctr = input.clicks / input.impressions;
    ctrMultiplier = Math.min(CTR_BOOST_CAP, Math.max(CTR_BOOST_FLOOR, ctr / CTR_BASELINE));
  }

  const finalScore = freshnessScore * featuredMultiplier * dealerMultiplier * ctrMultiplier;

  return { freshnessScore, featuredMultiplier, dealerMultiplier, ctrMultiplier, ctr, finalScore };
}
