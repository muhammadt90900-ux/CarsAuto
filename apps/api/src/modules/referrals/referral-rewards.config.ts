// apps/api/src/modules/referrals/referral-rewards.config.ts
//
// Single source of truth for the milestone → reward mapping. Kept as plain
// data (not scattered through if/else branches in the service) so the
// reward ladder is easy to read/audit and easy to extend later without
// touching qualification logic.

export type ReferralRewardType = 'PREMIUM_MONTHS' | 'BADGE';

export interface ReferralRewardTier {
  milestone: number;
  type: ReferralRewardType;
  // For PREMIUM_MONTHS
  premiumMonths?: number;
  // For BADGE — reuses the existing DealerBadge model/shape
  badgeCode?: string;
  badgeLabel?: string;
  badgeIcon?: string;
}

export const REFERRAL_REWARD_TIERS: ReferralRewardTier[] = [
  { milestone: 3,   type: 'PREMIUM_MONTHS', premiumMonths: 1 },
  { milestone: 10,  type: 'PREMIUM_MONTHS', premiumMonths: 3 },
  { milestone: 25,  type: 'BADGE', badgeCode: 'GOLD_PARTNER',   badgeLabel: 'Gold Partner',           badgeIcon: '🥇' },
  { milestone: 50,  type: 'BADGE', badgeCode: 'VIP_DEALER',     badgeLabel: 'VIP Dealer',             badgeIcon: '💎' },
  { milestone: 100, type: 'BADGE', badgeCode: 'AMBASSADOR',     badgeLabel: 'CarsAuto Ambassador',    badgeIcon: '🏆' },
];

/** Sorted ascending — REFERRAL_REWARD_TIERS is already in order, but this
 * guards against future edits breaking that assumption. */
export const SORTED_REFERRAL_REWARD_TIERS = [...REFERRAL_REWARD_TIERS].sort(
  (a, b) => a.milestone - b.milestone,
);

export function nextMilestone(qualifiedCount: number): { milestone: number; remaining: number } | null {
  const next = SORTED_REFERRAL_REWARD_TIERS.find((t) => t.milestone > qualifiedCount);
  if (!next) return null;
  return { milestone: next.milestone, remaining: next.milestone - qualifiedCount };
}
