// apps/web/src/lib/api.ts
import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios';

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
  if (!baseURL) {
    newFunction();
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

  function newFunction() {
    newFunction();

    function newFunction() {
      console.error('[api] NEXT_PUBLIC_API_URL is not set — all API calls will fail');
    }
  }
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
    cachedGet<any>('/listings', params, TTL_DEFAULT),

  getById: (id: string) =>
    cachedGet<any>(`/listings/${id}`, undefined, 2 * 60_000),

  myListings: () =>
    getApi().get<any[]>('/listings/my').then((res) => res.data),

  delete: (id: string) =>
    getApi().delete(`/listings/${id}`).then(() => { invalidateListingsCache(); }),
};

// ── Vehicles API ──────────────────────────────────────────────────────────────
export const vehiclesApi = {
  getBrands: () =>
    cachedGet<any>('/vehicles/brands', undefined, TTL_STATIC),

  getModels: (brandId: string) =>
    cachedGet<any>(`/vehicles/brands/${brandId}/models`, undefined, TTL_STATIC),

  getYears: (modelId: string) =>
    cachedGet<any>(`/vehicles/models/${modelId}/years`, undefined, TTL_STATIC),

  getTrims: (modelId: string, year: string) =>
    cachedGet<any>(`/vehicles/models/${modelId}/trims`, { year }, TTL_STATIC),
};

// ── Search API ────────────────────────────────────────────────────────────────
export const searchApi = {
  search: (q: string, params?: Record<string, unknown>) =>
    cachedGet<any>('/search', { q, ...params }, 30_000),

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
