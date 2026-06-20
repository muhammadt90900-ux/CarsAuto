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
} as const;
