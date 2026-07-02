// packages/types/src/user.ts
export enum UserRole {
  USER = 'USER',
  DEALER = 'DEALER',
  ADMIN = 'ADMIN',
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
}

export interface Review {
  id: string;
  reviewerId: string;
  revieweeId: string;
  rating: number;
  comment: string;
  createdAt: Date;
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
