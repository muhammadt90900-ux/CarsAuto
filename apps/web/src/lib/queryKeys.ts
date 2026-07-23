// apps/web/src/lib/queryKeys.ts
// Single source of truth for TanStack Query cache keys.
// Structured as factory functions so dependent queries can be invalidated by prefix.

export const queryKeys = {
  listings: {
    all: ['listings'] as const,
    list: (params: Record<string, unknown>) => ['listings', 'list', params] as const,
    detail: (id: string) => ['listings', 'detail', id] as const,
    similar: (id: string) => ['listings', 'similar', id] as const,
    mine: () => ['listings', 'mine'] as const,
    // Search Architecture Phase 3
    facets: (params: Record<string, unknown>) => ['listings', 'facets', params] as const,
  },
  vehicles: {
    brands: (q?: string) => ['vehicles', 'brands', q ?? ''] as const,
    models: (brandId: string, q?: string) => ['vehicles', 'models', brandId, q ?? ''] as const,
    years: (modelId: string) => ['vehicles', 'years', modelId] as const,
    trims: (modelId: string, year: string) => ['vehicles', 'trims', modelId, year] as const,
  },
  search: {
    results: (q: string, filters: Record<string, unknown>) => ['search', q, filters] as const,
    autocomplete: (q: string) => ['search', 'autocomplete', q] as const,
  },
  auth: {
    me: () => ['auth', 'me'] as const,
  },
  favorites: {
    all: () => ['favorites'] as const,
  },
  admin: {
    badgeCounts: () => ['admin', 'badge-counts'] as const,
  },
  beta: {
    registrations: (params: Record<string, unknown>) => ['beta', 'registrations', params] as const,
    pendingCount: () => ['beta', 'pending-count'] as const,
  },
  notifications: {
    unreadCount: () => ['notifications', 'unread-count'] as const,
  },
  referrals: {
    myDashboard: () => ['referrals', 'me'] as const,
  },
  chat: {
    unreadCount: () => ['chat', 'unread-count'] as const,
  },
  public: {
    stats: () => ['public', 'stats'] as const,
    categoryStats: () => ['public', 'stats', 'categories'] as const,
    brandStats: () => ['public', 'stats', 'brands'] as const,
  },
  reviews: {
    featured: (limit: number) => ['reviews', 'featured', limit] as const,
  },
  inventory: {
    list: (params: Record<string, unknown>) => ['inventory', 'list', params] as const,
    detail: (id: string) => ['inventory', 'detail', id] as const,
    lowStock: () => ['inventory', 'low-stock'] as const,
  },
  sales: {
    list: (params: Record<string, unknown>) => ['sales', 'list', params] as const,
    detail: (id: string) => ['sales', 'detail', id] as const,
    invoices: () => ['sales', 'invoices'] as const,
    customers: (search?: string) => ['sales', 'customers', search ?? ''] as const,
  },
  accounting: {
    expenses: (params: Record<string, unknown>) => ['accounting', 'expenses', params] as const,
    profitLoss: (params: Record<string, unknown>) => ['accounting', 'profit-loss', params] as const,
  },
} as const;
