// apps/web/src/lib/api.ts
import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import type {
  Listing,
  ListingListResponse,
  ListingDetailResponse,
  CarMake,
  CarModel,
  SearchResponse,
  DealerListResponse,
  DealerProfile,
  NotificationItem,
  ChatConversation,
  Message,
  BetaRegistration,
  BetaRegistrationListResponse,
  BetaRegistrationStatus,
  RegisterBetaPayload,
  ReferralDashboard,
  ReferralListResponse,
  ReferralStats,
  ReferralLeaderboardEntry,
  ReferralTree,
} from '@cars-auto/types';

// ── In-memory access token (never stored in localStorage) ────────────────────
let accessToken: string | null = null;
let isRefreshing = false;
let refreshQueue: Array<{
  resolve: (token: string) => void;
  reject:  (err: unknown)  => void;
}> = [];

export function setAccessToken(token: string | null): void { accessToken = token; }
export function getAccessToken(): string | null            { return accessToken; }

function drainRefreshQueue(error: unknown, token: string | null): void {
  refreshQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error);
    else if (token) resolve(token);
  });
  refreshQueue = [];
}

// ── In-memory SWR cache ───────────────────────────────────────────────────────
interface CacheEntry {
  data:         unknown;
  revalidateAt: number;
  expiresAt:    number;
}

const cache    = new Map<string, CacheEntry>();
const inflight = new Map<string, Promise<unknown>>();

const TTL_DEFAULT = 60_000;
const TTL_STATIC  = 10 * 60_000;
const SWR_RATIO   = 0.5;

function buildCacheKey(url: string, params?: Record<string, unknown>): string {
  if (!params || Object.keys(params).length === 0) return url;
  const qs = Object.keys(params)
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join('&');
  return `${url}?${qs}`;
}

function getFromCache(key: string): { data: unknown; stale: boolean } | null {
  const entry = cache.get(key);
  if (!entry) return null;
  const now = Date.now();
  if (now > entry.expiresAt) { cache.delete(key); return null; }
  return { data: entry.data, stale: now > entry.revalidateAt };
}

function setInCache(key: string, data: unknown, ttlMs = TTL_DEFAULT): void {
  const now = Date.now();
  cache.set(key, {
    data,
    revalidateAt: now + ttlMs * SWR_RATIO,
    expiresAt:    now + ttlMs,
  });
}

// Cache GC — client-only
if (typeof window !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [k, v] of cache) {
      if (now > v.expiresAt) cache.delete(k);
    }
  }, 60_000);
}

// ── Axios lazy singleton ──────────────────────────────────────────────────────
// IMPORTANT: axios.create() must NOT run at module top-level in Next.js 16
// with Turbopack — it causes the entire module to be undefined during SSR,
// which makes listingsApi.myListings (and every other export) throw at runtime.
let _api: AxiosInstance | null = null;

function createApiInstance(): AxiosInstance {
  const baseURL = process.env.NEXT_PUBLIC_API_URL;
  // BUG FIX: this previously called `newFunction()`, which called itself
  // again before ever logging anything — guaranteed infinite recursion /
  // stack overflow the instant NEXT_PUBLIC_API_URL was missing, instead of
  // just warning and continuing with a relative baseURL.
  if (!baseURL) {
    console.error('[api] NEXT_PUBLIC_API_URL is not set — all API calls will fail');
  }

  const instance = axios.create({
    baseURL,
    withCredentials: true,
    timeout: 15_000,
    headers: {
      'Content-Type':     'application/json',
      'X-Requested-With': 'XMLHttpRequest',
    },
  });

  // ── Request interceptor — attach access token ────────────────────────────
  instance.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
      if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
      if (config.data instanceof FormData) {
        delete config.headers['Content-Type'];
      }
      return config;
    },
    (error) => Promise.reject(error),
  );

  // ── Response interceptor — transparent token rotation on 401 ────────────
  instance.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
      const originalRequest  = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
      const is401            = error.response?.status === 401;
      const alreadyRetried   = originalRequest?._retry;
      const isRefreshRequest = originalRequest?.url?.includes('/auth/refresh');

      if (is401 && !alreadyRetried && !isRefreshRequest) {
        if (isRefreshing) {
          return new Promise<string>((resolve, reject) => {
            refreshQueue.push({ resolve, reject });
          }).then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return instance(originalRequest);
          });
        }

        originalRequest._retry = true;
        isRefreshing = true;

        try {
          const { data } = await instance.post<{ access_token: string }>('/auth/refresh');
          const newToken = data.access_token;
          setAccessToken(newToken);
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          drainRefreshQueue(null, newToken);
          return instance(originalRequest);
        } catch (refreshError) {
          drainRefreshQueue(refreshError, null);
          setAccessToken(null);
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('auth:session-expired'));
          }
          return Promise.reject(refreshError);
        } finally {
          isRefreshing = false;
        }
      }

      return Promise.reject(error);
    },
  );

  return instance;
}

// Exported singleton — always call getApi() inside API methods, never at
// module evaluation time, so SSR never touches axios.create().
export function getApi(): AxiosInstance {
  if (!_api) _api = createApiInstance();
  return _api;
}

// Convenience proxy — safe because it is only *called* (never evaluated)
// inside async functions that only run on the client.
export const api: AxiosInstance = new Proxy({} as AxiosInstance, {
  get(_target, prop) {
    return (getApi() as any)[prop];
  },
  apply(_target, _this, args) {
    return (getApi() as any)(...args);
  },
});

// ── cachedGet — SWR + request deduplication ───────────────────────────────────
async function cachedGet<T>(
  url: string,
  params?: Record<string, unknown>,
  ttlMs = TTL_DEFAULT,
): Promise<T> {
  const key    = buildCacheKey(url, params);
  const cached = getFromCache(key);

  if (cached) {
    if (!cached.stale) return cached.data as T;

    if (!inflight.has(key)) {
      const bg = getApi()
        .get<T>(url, { params })
        .then((res) => { setInCache(key, res.data, ttlMs); return res.data; })
        .catch(() => { /* keep stale data on network error */ })
        .finally(() => inflight.delete(key));
      inflight.set(key, bg);
    }
    return cached.data as T;
  }

  if (inflight.has(key)) return inflight.get(key) as Promise<T>;

  const fresh = getApi()
    .get<T>(url, { params })
    .then((res) => {
      setInCache(key, res.data, ttlMs);
      return res.data;
    })
    .finally(() => inflight.delete(key));

  inflight.set(key, fresh);
  return fresh;
}

// ── Auth API ──────────────────────────────────────────────────────────────────
export const authApi = {
  register: async (data: {
    name:      string;
    email:     string;
    password:  string;
    role?:     string;
    phone?:    string;
  }) => {
    const res = await getApi().post<{ access_token: string; user: AuthUser }>('/auth/register', data);
    setAccessToken(res.data.access_token);
    return res.data;
  },

  login: async (data: { email: string; password: string }) => {
    const res = await getApi().post<{ access_token: string; user: AuthUser }>('/auth/login', data);
    setAccessToken(res.data.access_token);
    return res.data;
  },

  logout: async (): Promise<void> => {
    try { await getApi().post('/auth/logout'); } finally { setAccessToken(null); }
  },

  me: async (): Promise<AuthUser> => {
    const res = await getApi().get<AuthUser>('/auth/me');
    return res.data;
  },

  forgotPassword: async (email: string): Promise<{ message: string }> => {
    const res = await getApi().post<{ message: string }>('/auth/forgot-password', { email });
    return res.data;
  },

  resetPassword: async (
    token: string,
    newPassword: string,
  ): Promise<{ message: string }> => {
    const res = await getApi().post<{ message: string }>('/auth/reset-password', {
      token,
      newPassword,
    });
    return res.data;
  },
};

// ── Listings API ──────────────────────────────────────────────────────────────
export const listingsApi = {
  getAll: (params?: Record<string, unknown>) =>
    cachedGet<ListingListResponse>('/listings', params, TTL_DEFAULT),

  // Search Architecture Phase 3: live facet counts for the marketplace
  // filter sidebar — called in parallel with getAll() above, same filter
  // params, never affects which listings getAll() itself returns. Returns
  // {} (not an error) if the search index is unavailable — see
  // ListingsService.getFacets()'s header comment.
  getFacets: (params?: Record<string, unknown>) =>
    cachedGet<Record<string, { value: string; count: number }[]>>('/listings/facets', params, TTL_DEFAULT),

  getById: (id: string) =>
    cachedGet<ListingDetailResponse>(`/listings/${id}`, undefined, 2 * 60_000),

  myListings: () =>
    getApi().get<ListingDetailResponse[]>('/listings/my').then((res) => res.data),

  delete: (id: string) =>
    getApi().delete(`/listings/${id}`).then(() => { invalidateListingsCache(); }),
};

// ── Vehicles API ──────────────────────────────────────────────────────────────
export const vehiclesApi = {
  getBrands: () =>
    cachedGet<CarMake[]>('/vehicles/brands', undefined, TTL_STATIC),

  getModels: (brandId: string) =>
    cachedGet<CarModel[]>(`/vehicles/brands/${brandId}/models`, undefined, TTL_STATIC),

  getYears: (modelId: string) =>
    cachedGet<number[]>(`/vehicles/models/${modelId}/years`, undefined, TTL_STATIC),

  getTrims: (modelId: string, year: string) =>
    cachedGet<string[]>(`/vehicles/models/${modelId}/trims`, { year }, TTL_STATIC),
};

// ── Search API ────────────────────────────────────────────────────────────────
export const searchApi = {
  search: (q: string, params?: Record<string, unknown>) =>
    cachedGet<SearchResponse>('/search', { q, ...params }, 30_000),

  autocomplete: (q: string) =>
    cachedGet<string[]>('/search/autocomplete', { q }, 2 * 60_000),
};

// ── Subscription API ──────────────────────────────────────────────────────────
export const subscriptionApi = {
  /** GET /api/subscriptions/status — current dealer permission status */
  getStatus: (): Promise<PermissionStatus> =>
    getApi().get('/subscriptions/status').then((r) => r.data),

  /** POST /api/subscriptions — create a Stripe PaymentIntent */
  createIntent: (plan: 'MONTHLY' | 'BIANNUAL' | 'ANNUAL') =>
    getApi()
      .post<{ clientSecret: string; plan: string; amount: number; currency: string }>(
        '/subscriptions',
        { plan },
      )
      .then((r) => r.data),

  /** POST /api/subscriptions/confirm — provision subscription after payment */
  confirm: (stripePaymentIntentId: string, plan: 'MONTHLY' | 'BIANNUAL' | 'ANNUAL') =>
    getApi()
      .post('/subscriptions/confirm', { stripePaymentIntentId, plan })
      .then((r) => r.data),
};

// ── Dealers API ───────────────────────────────────────────────────────────────
export const dealersApi = {
  getAll: (params: Record<string, unknown> = {}) => {
    const query = new URLSearchParams(
      Object.fromEntries(
        Object.entries(params).map(([k, v]) => [k, String(v)]),
      ),
    ).toString();
    return cachedGet<DealerListResponse>(`/dealers?${query}`);
  },

  getBySlug: (slug: string) =>
    cachedGet<DealerProfile>(`/dealers/${slug}`),

  getLeads: () =>
    api.get<{ data: unknown[] }>('/dealers/me/leads').then((r) => r.data),

  getAnalytics: () =>
    api.get<DealerProfile['analytics']>('/dealers/me/analytics').then((r) => r.data),

  updateProfile: (data: Record<string, unknown>) =>
    api.patch<DealerProfile>('/dealers/me', data).then((r) => r.data),

  register: (data: Record<string, unknown>) =>
    api.post<DealerProfile>('/dealers', data).then((r) => r.data),

  follow: (dealerId: string) =>
    api.post<{ followerCount: number }>(`/dealers/${dealerId}/follow`).then((r) => r.data),

  contact: (dealerId: string, data: Record<string, unknown>) =>
    api.post<{ message: string }>(`/dealers/${dealerId}/contact`, data).then((r) => r.data),
};

// ── Admin API ─────────────────────────────────────────────────────────────────
export const adminApi = {
  setUserRole: (id: string, role: 'USER' | 'DEALER' | 'ADMIN') =>
    getApi().patch<{ id: string; email: string; role: string }>(
      `/admin/users/${id}/role`,
      { role }
    ).then(r => r.data),

  banUser: (id: string, banned: boolean) =>
    getApi().patch<{ id: string; banned: boolean }>(
      `/admin/users/${id}/ban`,
      { banned }
    ).then(r => r.data),

  // Pass until: null to lift an existing suspension early.
  suspendUser: (id: string, until: string | null, reason?: string) =>
    getApi().patch<{ id: string; suspendedUntil: string | null }>(
      `/admin/users/${id}/suspend`,
      { until, reason }
    ).then(r => r.data),

  /**
   * Sidebar badge counts. Previously hardcoded (`BADGE_COUNTS` in
   * components/admin/Sidebar.tsx, with its own comment admitting
   * "in production these would come from a real-time API call").
   *
   * Note on the reports count: /admin/reports has a pre-existing backend
   * bug (see admin.controller.ts) where the status/targetType query params
   * are declared but never actually forwarded to the service, so the
   * service's own default (status='PENDING') always applies regardless of
   * what we pass here. That default happens to be exactly what we want for
   * a "needs attention" badge, so this works correctly today — but if that
   * controller bug is ever fixed, this call needs to explicitly pass
   * `status=PENDING` to keep meaning the same thing.
   */
  getBadgeCounts: async (): Promise<{ moderation: number; reports: number; betaRegistrations: number }> => {
    const [moderationRes, reportsRes, betaRes] = await Promise.all([
      getApi().get<{ total: number }>('/admin/listings', { params: { status: 'PENDING', limit: 1 } }),
      getApi().get<{ total: number }>('/admin/reports', { params: { limit: 1 } }),
      getApi().get<{ count: number }>('/beta/registrations/pending-count'),
    ]);
    return {
      moderation: moderationRes.data.total ?? 0,
      reports: reportsRes.data.total ?? 0,
      betaRegistrations: betaRes.data.count ?? 0,
    };
  },
};

// ── Users API ─────────────────────────────────────────────────────────────────
export const usersApi = {
  // FIX: '/users/me' isn't a real route — it fell through to `GET /users/:id`
  // with id="me", which 400s on ParseUUIDPipe. There's no GET /users/me on
  // the backend; /auth/me (now fixed to return the full profile) is the
  // correct endpoint for "get my own profile".
  getMe: () =>
    api.get<AuthUser>('/auth/me').then((r) => r.data),

  updateMe: (data: Record<string, unknown>) =>
    api.patch<AuthUser>('/users/profile', data).then((r) => r.data),  // FIX: was /users/me (404)

  /**
   * POST /upload/image (type=avatars)
   * Uploads a profile photo as multipart/form-data and returns the Cloudinary
   * CDN URL. Backend already supported an 'avatars' folder/transform (see
   * upload.controller.ts / upload.service.ts) — it just had no caller from
   * the profile page. Mirrors sellApi.uploadImage's axios/FormData handling
   * (no manual Content-Type — axios sets the multipart boundary itself).
   */
  uploadAvatar: async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', 'avatars');
    const res = await api.post<{ url: string }>('/upload/image', formData);
    return res.data.url;
  },

  getFavorites: () =>
    api.get<{ data: Listing[] }>('/users/me/favorites').then((r) => r.data),

  addFavorite: (listingId: string) =>
    api.post<{ favorited: true }>(`/users/me/favorites/${listingId}`).then((r) => r.data),

  removeFavorite: (listingId: string) =>
    api.delete<{ favorited: false }>(`/users/me/favorites/${listingId}`).then((r) => r.data),
};

// ── Notifications API ─────────────────────────────────────────────────────────
export const notificationsApi = {
  getAll: () =>
    api.get<{ data: NotificationItem[] }>('/notifications').then((r) => r.data),

  getUnreadCount: () =>
    api.get<{ count: number }>('/notifications/unread-count').then((r) => r.data),

  markRead: (id: string) =>
    api.patch<NotificationItem>(`/notifications/${id}/read`).then((r) => r.data),

  markAllRead: () =>
    api.patch<{ count: number }>('/notifications/read-all').then((r) => r.data),

  delete: (id: string) =>
    api.delete<{ id: string }>(`/notifications/${id}`).then((r) => r.data),
};

// ── Chat API ──────────────────────────────────────────────────────────────────
export const chatApi = {
  getConversations: () =>
    api.get<ChatConversation[]>('/chats').then((r) => r.data),

  // FIX: was completely missing. The backend has always had
  // POST /chats/:listingId (ChatController.getOrCreate → getOrCreateChat),
  // which finds an existing buyer↔seller conversation for a listing or
  // creates one — but no frontend function ever called it, so no "Chat"
  // button on any listing detail page had anything to call. This is what
  // the seller-contact "Chat" buttons on Car/Listing/Motorcycle detail
  // pages call before routing to /dashboard/messages?chatId=<id>.
  startChat: (listingId: string) =>
    api.post<ChatConversation>(`/chats/${listingId}`).then((r) => r.data),

  getMessages: (conversationId: string) =>
    api
      .get<{ data: Message[] }>(`/chats/${conversationId}/messages`)
      .then((r) => r.data),

  sendMessage: (conversationId: string, content: string) =>
    api
      .post<Message>(`/chats/${conversationId}/messages`, { content })
      .then((r) => r.data),

  // Total unread message count across all of the user's conversations.
  // Backend: GET /chats/unread/count (ChatController.getUnreadCount).
  getUnreadCount: () =>
    api.get<{ count: number }>('/chats/unread/count').then((r) => r.data),
};

// ── Cache invalidation ────────────────────────────────────────────────────────
export function invalidateListingsCache(): void {
  for (const k of cache.keys()) {
    if (k.startsWith('/listings') || k.startsWith('/search')) {
      cache.delete(k);
    }
  }
}

// ── Types ─────────────────────────────────────────────────────────────────────
export interface AuthUser {
  id:       string;
  name:     string;
  email:    string;
  phone:    string | null;
  role:     'USER' | 'DEALER' | 'ADMIN';
  verified: boolean;
  avatar?:  string | null; // FIX: was missing — backend already returns/accepts it
}

export interface PermissionStatus {
  canPost:              boolean;
  reason:               'ADMIN' | 'SUBSCRIBED' | 'TRIAL' | 'TRIAL_EXPIRED' | 'LIMIT_REACHED' | 'NOT_DEALER';
  trialEnd?:            string; // ISO date string from JSON
  trialPostsUsed?:      number;
  trialPostsRemaining?: number;
  subscriptionEnd?:     string; // ISO date string from JSON
  plan?:                string;
}

// ── Public Stats API ─────────────────────────────────────────────────────
// Backs the footer trust-signal stats (listings/dealers/cities/rating),
// which were previously hardcoded fake numbers with no data source.
export interface PublicStats {
  activeListings: number;
  verifiedDealers: number;
  cities: number;
  averageRating: number;
}

// Backs the homepage "Browse by Category" tile counts, which were
// previously hardcoded strings like "4,200+" with no data source.
// "luxury" is intentionally absent — see stats.service.ts for why.
export interface CategoryStats {
  sedan: number;
  suv: number;
  electric: number;
  pickup: number;
  parts: number;
}

// Backs the homepage "Trending Brands" tile counts, keyed by brand's
// English name (same key the UI already renders as the brand label).
export type BrandStats = Record<string, number>;

export const publicApi = {
  getStats: () => cachedGet<PublicStats>('/public/stats', undefined, 10 * 60_000),
  getCategoryStats: () => cachedGet<CategoryStats>('/public/stats/categories', undefined, 10 * 60_000),
  getBrandStats: () => cachedGet<BrandStats>('/public/stats/brands', undefined, 10 * 60_000),
};

// Backs the homepage testimonials section (real reviews — see
// reviews.service.ts's findFeatured for selection criteria). Replaces what
// used to be three fabricated named-customer quotes hardcoded on the page.
export interface FeaturedReview {
  id: string;
  rating: number;
  comment: string;
  createdAt: string;
  verified: boolean;
  reviewer: { name: string | null; avatar: string | null };
}

export const reviewsApi = {
  getFeatured: (limit = 6) =>
    cachedGet<FeaturedReview[]>('/reviews/featured', { limit }, 5 * 60_000),
};

// ── Newsletter API ────────────────────────────────────────────────────────
export const newsletterApi = {
  subscribe: (email: string, locale?: string) =>
    getApi().post<{ subscribed: true }>('/marketing/newsletter', { email, locale }).then(r => r.data),
};

// ── Beta Registration API ───────────────────────────────────────────────────
export const betaApi = {
  register: (data: RegisterBetaPayload) =>
    getApi().post<BetaRegistration>('/beta/register', data).then(r => r.data),

  getAll: (params: Record<string, unknown> = {}) => {
    const query = new URLSearchParams(
      Object.fromEntries(
        Object.entries(params)
          .filter(([, v]) => v !== undefined && v !== null && v !== '')
          .map(([k, v]) => [k, String(v)]),
      ),
    ).toString();
    return getApi().get<BetaRegistrationListResponse>(`/beta/registrations?${query}`).then(r => r.data);
  },

  getPendingCount: () =>
    getApi().get<{ count: number }>('/beta/registrations/pending-count').then(r => r.data),

  updateStatus: (id: string, status: BetaRegistrationStatus) =>
    getApi().patch<BetaRegistration>(`/beta/registrations/${id}/status`, { status }).then(r => r.data),
};

// ── Referrals API (Referral & Rewards System) ──────────────────────────────────
export const referralsApi = {
  /** GET /api/referrals/me — Seller Dashboard summary */
  getMyDashboard: () =>
    getApi().get<ReferralDashboard>('/referrals/me').then(r => r.data),
};

// ── Admin Referrals API ──────────────────────────────────────────────────────────
export const adminReferralsApi = {
  getAll: (params: Record<string, unknown> = {}) => {
    const query = new URLSearchParams(
      Object.fromEntries(
        Object.entries(params)
          .filter(([, v]) => v !== undefined && v !== null && v !== '')
          .map(([k, v]) => [k, String(v)]),
      ),
    ).toString();
    return getApi().get<ReferralListResponse>(`/admin/referrals?${query}`).then(r => r.data);
  },

  getStats: () =>
    getApi().get<ReferralStats>('/admin/referrals/stats').then(r => r.data),

  getLeaderboard: (limit = 20) =>
    getApi().get<ReferralLeaderboardEntry[]>(`/admin/referrals/leaderboard?limit=${limit}`).then(r => r.data),

  getTree: (dealerId: string) =>
    getApi().get<ReferralTree>(`/admin/referrals/tree/${dealerId}`).then(r => r.data),

  approve: (id: string) =>
    getApi().patch(`/admin/referrals/${id}/approve`).then(r => r.data),

  reject: (id: string, reason?: string) =>
    getApi().patch(`/admin/referrals/${id}/reject`, { reason }).then(r => r.data),

  suspend: (id: string) =>
    getApi().patch(`/admin/referrals/${id}/suspend`).then(r => r.data),

  exportUrl: () => `/api/admin/referrals/export`,
};

export default api;
