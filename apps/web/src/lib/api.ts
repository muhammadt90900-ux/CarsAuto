// apps/web/src/lib/api.ts
import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios';

// ── Token management (in-memory only — no localStorage for access tokens) ──
let accessToken: string | null = null;
let isRefreshing = false;
let pendingQueue: Array<{
  resolve: (token: string) => void;
  reject: (err: unknown) => void;
}> = [];

export function setAccessToken(token: string | null) {
  accessToken = token;
}

export function getAccessToken(): string | null {
  return accessToken;
}

function processQueue(error: unknown, token: string | null) {
  pendingQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error);
    else if (token) resolve(token);
  });
  pendingQueue = [];
}

// ── In-memory GET cache (avoids duplicate in-flight requests) ──────────────
// Keyed by "<method>:<url>?<params>". Entries expire after TTL_MS.
const TTL_MS = 30_000; // 30 s
type CacheEntry = { data: unknown; expiresAt: number };
const _cache = new Map<string, CacheEntry>();

function cacheKey(url: string, params?: Record<string, unknown>): string {
  const qs = params ? '?' + new URLSearchParams(params as any).toString() : '';
  return url + qs;
}

function getCached(key: string): unknown | null {
  const entry = _cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) { _cache.delete(key); return null; }
  return entry.data;
}

function setCache(key: string, data: unknown) {
  _cache.set(key, { data, expiresAt: Date.now() + TTL_MS });
}

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
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// ── Response interceptor: refresh token rotation on 401 ───────────────────
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    const is401 = error.response?.status === 401;
    const alreadyRetried = originalRequest._retry;
    const isRefreshEndpoint = originalRequest.url?.includes('/auth/refresh');

    if (is401 && !alreadyRetried && !isRefreshEndpoint) {
      if (isRefreshing) {
        return new Promise<string>((resolve, reject) => {
          pendingQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
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

// ── Cached GET helper ──────────────────────────────────────────────────────
async function cachedGet<T>(url: string, params?: Record<string, unknown>): Promise<T> {
  const key = cacheKey(url, params);
  const cached = getCached(key);
  if (cached !== null) return cached as T;
  const res = await api.get<T>(url, { params });
  setCache(key, res.data);
  return res.data;
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
    try {
      await api.post('/auth/logout');
    } finally {
      setAccessToken(null);
    }
  },

  me: async (): Promise<AuthUser> => {
    const res = await api.get<AuthUser>('/auth/me');
    return res.data;
  },
};

// ── Listings API ───────────────────────────────────────────────────────────
export const listingsApi = {
  getAll: async (params?: Record<string, unknown>) =>
    cachedGet<any>('/listings', params),

  getById: async (id: string) =>
    cachedGet<any>(`/listings/${id}`),
};

// ── Vehicles API ───────────────────────────────────────────────────────────
// Vehicle data is effectively static — cache for 5 min
export const vehiclesApi = {
  getBrands: async () =>
    cachedGet<any>('/vehicles/brands'),

  getModels: async (brandId: string) =>
    cachedGet<any>(`/vehicles/brands/${brandId}/models`),

  getYears: async (modelId: string) =>
    cachedGet<any>(`/vehicles/models/${modelId}/years`),

  getTrims: async (modelId: string, year: string) =>
    cachedGet<any>(`/vehicles/models/${modelId}/trims`, { year }),
};

// ── Search API ─────────────────────────────────────────────────────────────
export const searchApi = {
  search: async (q: string, params?: Record<string, unknown>) =>
    cachedGet<any>('/search', { q, ...params }),

  autocomplete: async (q: string) =>
    cachedGet<string[]>('/search/autocomplete', { q }),
};

// ── Types ──────────────────────────────────────────────────────────────────
export interface AuthUser {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: 'USER' | 'DEALER' | 'ADMIN';
  verified: boolean;
}
