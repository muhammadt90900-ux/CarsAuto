// packages/types/src/referral.ts

export type ReferralStatus = 'PENDING' | 'QUALIFIED' | 'REJECTED' | 'SUSPENDED';

export type ReferralRewardType = 'PREMIUM_MONTHS' | 'BADGE';

export interface ReferralRewardTier {
  milestone: number;
  type: ReferralRewardType;
  premiumMonths?: number;
  badgeCode?: string;
  badgeLabel?: string;
  badgeIcon?: string;
}

export interface ReferralHistoryItem {
  id: string;
  status: ReferralStatus;
  createdAt: string;
  qualifiedAt: string | null;
  dealerApproved: boolean;
  accountVerified: boolean;
  hasPublishedListing: boolean;
  referredUser: { name: string } | null;
}

export interface ReferralBadge {
  code: string;
  label: string;
  icon: string | null;
  awardedAt: string;
}

export interface ReferralDashboard {
  referralCode: string | null;
  totalReferrals: number;
  successfulReferrals: number;
  pendingReferrals: number;
  rejectedReferrals: number;
  premiumMonthsEarned: number;
  lastMilestone: number;
  nextMilestone: { milestone: number; remaining: number } | null;
  rewardTiers: ReferralRewardTier[];
  badges: ReferralBadge[];
  history: ReferralHistoryItem[];
}

export interface ReferralListItem {
  id: string;
  status: ReferralStatus;
  referralCodeUsed: string;
  createdAt: string;
  qualifiedAt: string | null;
  rejectedAt: string | null;
  rejectedReason: string | null;
  referrerDealer: { id: string; nameEn: string; nameKu: string; slug: string; referralCode: string | null };
  referredUser: { id: string; name: string; email: string };
}

export interface ReferralListResponse {
  data: ReferralListItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ReferralStats {
  total: number;
  qualified: number;
  pending: number;
  rejected: number;
}

export interface ReferralLeaderboardEntry {
  id: string;
  nameEn: string;
  nameKu: string;
  slug: string;
  referralCode: string | null;
  referralCount: number;
  qualifiedReferralCount: number;
  premiumMonthsEarned: number;
  lastReferralMilestone: number;
}

export interface ReferralTree {
  dealer: {
    id: string; nameEn: string; nameKu: string;
    referralCode: string | null; qualifiedReferralCount: number;
  };
  referrals: Array<{
    id: string;
    status: ReferralStatus;
    createdAt: string;
    qualifiedAt: string | null;
    referredUser: { name: string; email: string } | null;
    referredDealerId: string | null;
  }>;
}
