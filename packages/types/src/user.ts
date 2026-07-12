// packages/types/src/user.ts
export enum UserRole {
  USER = 'USER',
  DEALER = 'DEALER',
  ADMIN = 'ADMIN',
}

// ADDED (Trust & Safety Prompt 6/7 frontend wiring): mirrors UserBadge
// (Prompt 1 schema) — distinct from DealerBadge below (that one has
// label/icon columns; UserBadge only has a `code`, so the frontend maps
// code → label/icon itself, see components/trust/badges.ts).
export interface UserBadge {
  code: string;
  awardedAt: string;
}

export interface User {
  id: string;
  email: string;
  phone?: string;
  name: string;
  avatar?: string;
  role: UserRole;
  verified: boolean;
  locale: 'ku' | 'ar' | 'en' | 'zh';
  createdAt: Date;
  // ADDED (Trust & Safety Prompt 2/6) — present on profile/listing-detail
  // responses (TrustProfileService), absent elsewhere. Optional because
  // most User-shaped API responses in this app (auth/me, admin user list,
  // etc.) don't attach these — only the two endpoints that call
  // TrustProfileService do.
  identityVerifiedAt?: string | null;
  trustScore?: number;
  badges?: UserBadge[];
}

export interface Review {
  id: string;
  reviewerId: string;
  revieweeId: string;
  rating: number;
  comment: string;
  createdAt: Date;
  // ADDED (Trust & Safety Prompt 7): non-null → "Verified Interaction" —
  // this pair had a real chat before the review was left. See
  // ReviewsService.create()'s comment for the lookup logic.
  chatId?: string | null;
  // Present on GET /users/:userId/reviews (ReviewsService.findByReviewee());
  // absent on other shapes reusing this interface (e.g. DealerProfile.reviews,
  // which is actually DealerReview under the hood — different model, this
  // interface predates Prompt 7 and is reused loosely across both).
  reviewer?: { id: string; name: string; avatar?: string | null };
}

/** GET /users/:userId/reviews */
export interface UserReviewListResponse {
  data: Review[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ─── Dealers ────────────────────────────────────────────────────────────────

export interface DealerBadge {
  code: string;
  label: string;
  icon: string;
}

export interface DealerLocation {
  city: string;
  nameKu: string;
  nameEn: string;
}

/** Summary shape used in dealer listing/search results and follow cards. */
export interface Dealer {
  id: string;
  slug: string;
  nameEn: string;
  nameAr: string;
  nameKu: string;
  logoUrl: string | null;
  coverUrl: string | null;
  tier: string;
  averageRating: number;
  totalReviews: number;
  activeListings: number;
  location: DealerLocation | null;
  badges: DealerBadge[];
  followerCount: number;
}

/** GET /dealers — paginated dealer summaries. */
export interface DealerListResponse {
  data: Dealer[];
  total: number;
}

/** GET /dealers/:slug — full dealer profile. */
export interface DealerProfile extends Dealer {
  reviews: Review[];
  analytics: {
    totalViews: number;
    totalLeads: number;
    conversionRate: number;
  };
  subscription: { plan: string; status: string; endDate: string } | null;
}
