// packages/types/src/beta.ts
import { ListingType } from './listing';

export type BetaRegistrationStatus = 'PENDING' | 'CONTACTED' | 'APPROVED' | 'REJECTED';

export interface BetaRegistration {
  id: string;
  dealerName: string;
  ownerName: string;
  phone: string;
  city: string;
  businessType: ListingType;
  facebookUrl: string | null;
  website: string | null;
  notes: string | null;
  referralId: string;
  referredByCode: string | null;
  referredById: string | null;
  status: BetaRegistrationStatus;
  isFoundingDealer: boolean;
  locale: string | null;
  /** Number of this registrant's referrals that have reached APPROVED — admin list only. */
  verifiedReferralCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface BetaRegistrationListResponse {
  data: BetaRegistration[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface RegisterBetaPayload {
  dealerName: string;
  ownerName: string;
  phone: string;
  city: string;
  businessType: ListingType;
  facebookUrl?: string;
  website?: string;
  notes?: string;
  referralCode?: string;
  betaAcknowledged: boolean;
  locale?: string;
}
