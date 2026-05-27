const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('access_token');
}

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = getToken();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: 'Unknown error' }));
    throw new Error(error.message || `HTTP ${res.status}`);
  }

  return res.json();
}

// ── Auth ──────────────────────────────────────────────────────
export const api = {
  auth: {
    register: (data: { email: string; password: string; name: string; phone?: string; locale?: string }) =>
      request<{ access_token: string; refresh_token: string }>('/auth/register', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    login: (data: { email: string; password: string }) =>
      request<{ access_token: string; refresh_token: string }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    me: () => request<any>('/auth/me'),
  },

  // ── Listings ────────────────────────────────────────────────
  listings: {
    getAll: (params?: Record<string, string>) => {
      const qs = params ? '?' + new URLSearchParams(params).toString() : '';
      return request<any>(`/listings${qs}`);
    },
    getOne: (id: string) => request<any>(`/listings/${id}`),
    create: (data: any) =>
      request<any>('/listings', { method: 'POST', body: JSON.stringify(data) }),
    delete: (id: string) =>
      request<any>(`/listings/${id}`, { method: 'DELETE' }),
    myListings: () => request<any>('/listings/my/listings'),
  },

  // ── Search ──────────────────────────────────────────────────
  search: {
    query: (q: string, type?: string, page = 1) => {
      const params = new URLSearchParams({ q, page: String(page) });
      if (type) params.set('type', type);
      return request<any>(`/search?${params}`);
    },
  },

  // ── Chat ────────────────────────────────────────────────────
  chat: {
    getAll: () => request<any>('/chats'),
    getOrCreate: (listingId: string) =>
      request<any>(`/chats/listing/${listingId}`, { method: 'POST' }),
    getMessages: (chatId: string) => request<any>(`/chats/${chatId}/messages`),
    send: (chatId: string, content: string, type = 'text') =>
      request<any>(`/chats/${chatId}/messages`, {
        method: 'POST',
        body: JSON.stringify({ content, type }),
      }),
  },

  // ── Notifications ───────────────────────────────────────────
  notifications: {
    getAll: () => request<any>('/notifications'),
    unreadCount: () => request<any>('/notifications/unread-count'),
    markAllRead: () => request<any>('/notifications/read-all', { method: 'PATCH' }),
  },

  // ── Users ───────────────────────────────────────────────────
  users: {
    getById: (id: string) => request<any>(`/users/${id}`),
    updateProfile: (data: any) =>
      request<any>('/users/profile', { method: 'PATCH', body: JSON.stringify(data) }),
  },
};
