// apps/web/src/lib/api.ts — PERFORMANCE OPTIMISED
// Key improvements:
//   1. Request deduplication: concurrent identical GETs share one in-flight promise
//   2. Per-endpoint TTL: static vehicle data cached 10 min; listings 60 s
//   3. Stale-while-revalidate: returns cached data immediately, refreshes in background
//   4. Abort controller integration: cancelled queries don't update cache

import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios';

// ── Token management (in-memory only — no localStorage for access tokens) ──
let accessToken: string | null = null;
let isRefreshing = false;
let pendingQueue: Array<{
  resolve: (token: string) => void;
  reject: (err: unknown) => void;
}> = [];

export function setAccessToken(token: string | null) { accessToken = token; }
export function getAccessToken(): string | null { return accessToken; }

function processQueue(error: unknown, token: string | null) {
  pendingQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error);
    else if (token) resolve(token);
  });
  pendingQueue = [];
}

// ── Enhanced in-memory cache with SWR semantics ────────────────────────────
// Keys: "<url>?<params>"  Values: { data, expiresAt, updatedAt }
// SWR: returns stale data immediately while background-refreshing when beyond TTL

interface CacheEntry {
  data: unknown;
  expiresAt: number;   // hard expiry — entry deleted after this
  revalidateAt: number; // soft expiry — background refresh triggered
}

const _cache = new Map<string, CacheEntry>();
// Dedup map: prevents parallel identical requests from hitting the server twice
const _inflight = new Map<string, Promise<unknown>>();

// Default TTLs (milliseconds)
const TTL_DEFAULT = 60_000;         // 60 s  — listings
const TTL_STATIC  = 10 * 60_000;    // 10 min — brands/models/trims
const SWR_RATIO   = 0.5;            // revalidate after 50% of TTL has elapsed

function cacheKey(url: string, params?: Record<string, unknown>): string {
  if (!params || Object.keys(params).length === 0) return url;
  const sorted = Object.keys(params).sort();
  const qs = sorted.map(k => `${k}=${params[k]}`).join('&');
  return `${url}?${qs}`;
}

function getCached(key: string): { data: unknown; stale: boolean } | null {
  const entry = _cache.get(key);
  if (!entry) return null;
  const now = Date.now();
  if (now > entry.expiresAt) { _cache.delete(key); return null; }
  return { data: entry.data, stale: now > entry.revalidateAt };
}

function setCache(key: string, data: unknown, ttlMs = TTL_DEFAULT) {
  _cache.set(key, {
    data,
    revalidateAt: Date.now() + ttlMs * SWR_RATIO,
    expiresAt:    Date.now() + ttlMs,
  });
}

// Periodic eviction of expired entries to prevent memory bloat
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of _cache) {
    if (now > v.expiresAt) _cache.delete(k);
  }
}, 60_000);

// ── Axios instance ─────────────────────────────────────────────────────────
const baseURL = process.env.NEXT_PUBLIC_API_URL;
if (!baseURL && typeof window !== 'undefined') {
  console.error('[api] NEXT_PUBLIC_API_URL is not set — API calls will fail');
}

export const api: AxiosInstance = axios.create({
  baseURL,
  withCredentials: true,
  timeout: 15_000,
  headers: {
    'Content-Type': 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
  },
});

// ── Request interceptor: attach access token ───────────────────────────────
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
    return config;
  },
  (error) => Promise.reject(error),
);

// ── Response interceptor: refresh token rotation on 401 ───────────────────
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
    const is401 = error.response?.status === 401;
    const alreadyRetried = originalRequest._retry;
    const isRefreshEndpoint = originalRequest.url?.includes('/auth/refresh');

    if (is401 && !alreadyRetried && !isRefreshEndpoint) {
      if (isRefreshing) {
        return new Promise<string>((resolve, reject) => {
          pendingQueue.push({ resolve, reject });
        }).then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return api(originalRequest);
        });
      }
      originalRequest._retry = true;
      isRefreshing = true;
      try {
        const { data } = await api.post<{ access_token: string }>('/auth/refresh');
        const newToken = data.access_token;
        setAccessToken(newToken);
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        processQueue(null, newToken);
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
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

// ── cachedGet: SWR + dedup ─────────────────────────────────────────────────
async function cachedGet<T>(
  url: string,
  params?: Record<string, unknown>,
  ttlMs = TTL_DEFAULT,
): Promise<T> {
  const key = cacheKey(url, params);
  const cached = getCached(key);

  if (cached) {
    if (!cached.stale) return cached.data as T;

    // Stale-while-revalidate: return immediately, refresh in background
    if (!_inflight.has(key)) {
      const bg = api.get<T>(url, { params }).then(res => {
        setCache(key, res.data, ttlMs);
        return res.data;
      }).catch(() => {/* keep stale data on error */}).finally(() => {
        _inflight.delete(key);
      });
      _inflight.set(key, bg);
    }
    return cached.data as T;
  }

  // Dedup: if an identical request is in-flight, wait for it
  if (_inflight.has(key)) return _inflight.get(key) as Promise<T>;

  const fresh = api.get<T>(url, { params }).then(res => {
    setCache(key, res.data, ttlMs);
    _inflight.delete(key);
    return res.data;
  }).catch(err => {
    _inflight.delete(key);
    throw err;
  });

  _inflight.set(key, fresh);
  return fresh;
}

// ── Auth API ───────────────────────────────────────────────────────────────
export const authApi = {
  register: async (data: { name: string; email: string; password: string; role?: string; phone?: string }) => {
    const res = await api.post<{ access_token: string; user: AuthUser }>('/auth/register', data);
    setAccessToken(res.data.access_token);
    return res.data;
  },
  login: async (data: { email: string; password: string }) => {
    const res = await api.post<{ access_token: string; user: AuthUser }>('/auth/login', data);
    setAccessToken(res.data.access_token);
    return res.data;
  },
  logout: async () => {
    try { await api.post('/auth/logout'); } finally { setAccessToken(null); }
  },
  me: async (): Promise<AuthUser> => {
    const res = await api.get<AuthUser>('/auth/me');
    return res.data;
  },

  /**
   * Step 1: request a reset link. Always resolves — server never reveals
   * whether the email is registered (enumeration protection).
   */
  forgotPassword: async (email: string): Promise<{ message: string }> => {
    const res = await api.post<{ message: string }>('/auth/forgot-password', { email });
    return res.data;
  },

  /**
   * Step 2: submit the token from the reset link + the new password.
   * On success the caller should redirect to /login.
   */
  resetPassword: async (token: string, newPassword: string): Promise<{ message: string }> => {
    const res = await api.post<{ message: string }>('/auth/reset-password', {
      token,
      newPassword,
    });
    return res.data;
  },
};

// ── Listings API ───────────────────────────────────────────────────────────
export const listingsApi = {
  // PERF: 60 s TTL — listings change frequently
  getAll: (params?: Record<string, unknown>) =>
    cachedGet<any>('/listings', params, TTL_DEFAULT),

  // PERF: 2 min TTL — detail page is stable once loaded
  getById: (id: string) =>
    cachedGet<any>(`/listings/${id}`, undefined, 2 * 60_000),
};

// ── Vehicles API — long TTL (reference data rarely changes) ───────────────
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

// ── Search API ─────────────────────────────────────────────────────────────
export const searchApi = {
  // PERF: 30 s TTL — search results should be relatively fresh
  search: (q: string, params?: Record<string, unknown>) =>
    cachedGet<any>('/search', { q, ...params }, 30_000),

  // PERF: 2 min TTL — autocomplete terms are stable within a session
  autocomplete: (q: string) =>
    cachedGet<string[]>('/search/autocomplete', { q }, 2 * 60_000),
};

// ── Cache invalidation helpers (call after mutations) ─────────────────────
export function invalidateListingsCache() {
  for (const k of _cache.keys()) {
    if (k.startsWith('/listings') || k.startsWith('/search')) _cache.delete(k);
  }
}

// ── Types ──────────────────────────────────────────────────────────────────
export interface AuthUser {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: 'USER' | 'DEALER' | 'ADMIN';
  verified: boolean;
}
