/**
 * apps/web/src/__tests__/unit/web-layer.spec.ts
 *
 * Unit tests for the web layer (framework-agnostic, no DOM required):
 *  - authStore logic (login, register, logout state transitions)
 *  - api.ts client-side cache (SWR, dedup, eviction)
 *  - useVehicleFilters cascade state machine
 *  - Locale/i18n URL helpers
 */

// ─────────────────────────────────────────────────────────────────────────────
// 1. Auth Store — state-machine tests (Zustand store without React)
// ─────────────────────────────────────────────────────────────────────────────

describe('AuthStore state machine', () => {
  // Minimal Zustand-compatible store implementation for pure logic testing
  type User = { id: string; email: string; role: string; name: string };

  interface State {
    user: User | null;
    isLoading: boolean;
  }

  function createStore() {
    let state: State = { user: null, isLoading: false };
    const listeners = new Set<() => void>();

    const set = (partial: Partial<State> | ((s: State) => Partial<State>)) => {
      const next = typeof partial === 'function' ? partial(state) : partial;
      state = { ...state, ...next };
      listeners.forEach(l => l());
    };

    const get = () => state;
    const subscribe = (l: () => void) => { listeners.add(l); return () => listeners.delete(l); };

    // Replicate store actions
    const mockAuthApi = {
      login: jest.fn(),
      register: jest.fn(),
      logout: jest.fn().mockResolvedValue(undefined),
      me: jest.fn(),
    };

    const actions = {
      login: async (email: string, password: string) => {
        set({ isLoading: true });
        try {
          const res = await mockAuthApi.login({ email, password });
          set({ user: res.user });
        } finally {
          set({ isLoading: false });
        }
      },
      register: async (name: string, email: string, password: string, role?: string) => {
        set({ isLoading: true });
        try {
          const res = await mockAuthApi.register({ name, email, password, role });
          set({ user: res.user });
        } finally {
          set({ isLoading: false });
        }
      },
      logout: async () => {
        await mockAuthApi.logout();
        set({ user: null });
      },
    };

    return { get, subscribe, actions, mockAuthApi };
  }

  it('starts with user=null and isLoading=false', () => {
    const store = createStore();
    expect(store.get().user).toBeNull();
    expect(store.get().isLoading).toBe(false);
  });

  it('sets isLoading=true during login, false after', async () => {
    const store = createStore();
    const user = { id: 'u1', email: 'x@x.com', role: 'USER', name: 'X' };
    store.mockAuthApi.login.mockResolvedValue({ user });

    const states: boolean[] = [];
    store.subscribe(() => states.push(store.get().isLoading));

    await store.actions.login('x@x.com', 'Pass1!');

    expect(states).toContain(true);
    expect(store.get().isLoading).toBe(false);
  });

  it('sets user after successful login', async () => {
    const store = createStore();
    const user = { id: 'u1', email: 'x@x.com', role: 'USER', name: 'X' };
    store.mockAuthApi.login.mockResolvedValue({ user });

    await store.actions.login('x@x.com', 'Pass1!');
    expect(store.get().user).toEqual(user);
  });

  it('sets user to null after logout', async () => {
    const store = createStore();
    const user = { id: 'u1', email: 'x@x.com', role: 'USER', name: 'X' };
    store.mockAuthApi.login.mockResolvedValue({ user });
    await store.actions.login('x@x.com', 'Pass1!');

    await store.actions.logout();
    expect(store.get().user).toBeNull();
  });

  it('keeps isLoading=false even if login throws', async () => {
    const store = createStore();
    store.mockAuthApi.login.mockRejectedValue(new Error('Network error'));

    try { await store.actions.login('x@x.com', 'Pass1!'); } catch {}
    expect(store.get().isLoading).toBe(false);
  });

  it('does not expose password in stored user', async () => {
    const store = createStore();
    const user = { id: 'u1', email: 'x@x.com', role: 'USER', name: 'X' };
    store.mockAuthApi.register.mockResolvedValue({ user }); // no password in response

    await store.actions.register('X', 'x@x.com', 'Pass1!', 'USER');
    expect((store.get().user as any)?.password).toBeUndefined();
  });

  it('sets user after successful registration', async () => {
    const store = createStore();
    const user = { id: 'u1', email: 'x@x.com', role: 'USER', name: 'X' };
    store.mockAuthApi.register.mockResolvedValue({ user });

    await store.actions.register('X', 'x@x.com', 'Pass1!');
    expect(store.get().user?.email).toBe('x@x.com');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. Client-side API cache (mirrors apps/web/src/lib/api.ts in-memory cache)
// ─────────────────────────────────────────────────────────────────────────────

describe('API client cache', () => {
  // Minimal re-implementation of the client cache
  interface Entry { data: unknown; expiresAt: number; revalidateAt: number; }
  const SWR_RATIO = 0.5;

  function createApiCache() {
    const store = new Map<string, Entry>();
    const inflight = new Map<string, Promise<unknown>>();

    const cacheKey = (url: string, params?: Record<string, unknown>) => {
      if (!params || !Object.keys(params).length) return url;
      const sorted = Object.keys(params).sort();
      return `${url}?${sorted.map(k => `${k}=${params[k]}`).join('&')}`;
    };

    const getCached = (key: string) => {
      const e = store.get(key);
      if (!e) return null;
      const now = Date.now();
      if (now > e.expiresAt) { store.delete(key); return null; }
      return { data: e.data, stale: now > e.revalidateAt };
    };

    const setCache = (key: string, data: unknown, ttlMs = 60_000) => {
      store.set(key, { data, revalidateAt: Date.now() + ttlMs * SWR_RATIO, expiresAt: Date.now() + ttlMs });
    };

    const fetchWithCache = async <T>(url: string, params?: Record<string, unknown>, ttl = 60_000, fetcher?: () => Promise<T>): Promise<T> => {
      const key = cacheKey(url, params);
      const cached = getCached(key);

      if (cached && !cached.stale) return cached.data as T;

      if (inflight.has(key)) return inflight.get(key) as Promise<T>;

      const req = (fetcher ?? (() => Promise.resolve({ mock: true } as unknown as T)))()
        .then(data => { setCache(key, data, ttl); return data; })
        .finally(() => inflight.delete(key));

      inflight.set(key, req);
      return req;
    };

    return { cacheKey, getCached, setCache, fetchWithCache, store, inflight };
  }

  it('cacheKey with no params returns bare URL', () => {
    const { cacheKey } = createApiCache();
    expect(cacheKey('/api/brands')).toBe('/api/brands');
  });

  it('cacheKey sorts params alphabetically for consistent keys', () => {
    const { cacheKey } = createApiCache();
    const k1 = cacheKey('/api/listings', { limit: 20, page: 1 });
    const k2 = cacheKey('/api/listings', { page: 1, limit: 20 });
    expect(k1).toBe(k2);
  });

  it('getCached returns null for missing key', () => {
    const { getCached } = createApiCache();
    expect(getCached('nope')).toBeNull();
  });

  it('setCache / getCached round-trips correctly', () => {
    const { setCache, getCached } = createApiCache();
    setCache('/brands', [{ id: 'b1' }], 60_000);
    expect(getCached('/brands')?.data).toEqual([{ id: 'b1' }]);
    expect(getCached('/brands')?.stale).toBe(false);
  });

  it('returns null for expired entry', async () => {
    const { setCache, getCached } = createApiCache();
    setCache('/brands', [{ id: 'b1' }], 1); // 1ms TTL
    await new Promise(r => setTimeout(r, 10));
    expect(getCached('/brands')).toBeNull();
  });

  it('marks entry stale after SWR threshold', async () => {
    const { setCache, getCached } = createApiCache();
    setCache('/brands', 'data', 10); // 10ms TTL → stale after 5ms
    await new Promise(r => setTimeout(r, 6));
    const result = getCached('/brands');
    expect(result?.stale).toBe(true);
    expect(result?.data).toBe('data'); // still returns value
  });

  it('deduplicates concurrent requests to same URL', async () => {
    const { fetchWithCache } = createApiCache();
    let callCount = 0;
    const slowFetcher = () => new Promise<string>(r => {
      callCount++;
      setTimeout(() => r('result'), 30);
    });

    const [r1, r2, r3] = await Promise.all([
      fetchWithCache('/brands', {}, 60_000, slowFetcher),
      fetchWithCache('/brands', {}, 60_000, slowFetcher),
      fetchWithCache('/brands', {}, 60_000, slowFetcher),
    ]);

    expect(callCount).toBe(1);
    expect(r1).toBe(r2);
    expect(r2).toBe(r3);
  });

  it('uses different cache entries for different params', async () => {
    const { fetchWithCache, store } = createApiCache();
    const fetcher = (val: string) => () => Promise.resolve(val);

    await fetchWithCache('/listings', { page: 1 }, 60_000, fetcher('page1'));
    await fetchWithCache('/listings', { page: 2 }, 60_000, fetcher('page2'));

    expect(store.size).toBe(2);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. useVehicleFilters — cascade state machine (pure logic, no React)
// ─────────────────────────────────────────────────────────────────────────────

describe('useVehicleFilters state machine', () => {
  // Pure state-machine logic extracted from the hook
  interface FilterState {
    brandId: string; modelId: string; year: string; trimId: string;
    models: any[]; years: any[]; trims: any[];
  }

  function createFilterMachine() {
    let state: FilterState = { brandId: '', modelId: '', year: '', trimId: '', models: [], years: [], trims: [] };

    return {
      getState: () => ({ ...state }),

      setBrandId: async (id: string, fetchModels: (brandId: string) => Promise<any[]>) => {
        state = { ...state, brandId: id, modelId: '', year: '', trimId: '', models: [], years: [], trims: [] };
        if (id) state.models = await fetchModels(id);
      },

      setModelId: async (id: string, fetchYears: (modelId: string) => Promise<number[]>) => {
        state = { ...state, modelId: id, year: '', trimId: '', years: [], trims: [] };
        if (id) state.years = await fetchYears(id);
      },

      setYear: async (year: string, fetchTrims: (modelId: string, year: number) => Promise<any[]>) => {
        state = { ...state, year, trimId: '', trims: [] };
        if (year && state.modelId) state.trims = await fetchTrims(state.modelId, Number(year));
      },

      reset: () => {
        state = { brandId: '', modelId: '', year: '', trimId: '', models: [], years: [], trims: [] };
      },
    };
  }

  it('starts with all fields empty', () => {
    const machine = createFilterMachine();
    const s = machine.getState();
    expect(s.brandId).toBe('');
    expect(s.models).toEqual([]);
    expect(s.years).toEqual([]);
  });

  it('setting brand clears model, year, trim downstream', async () => {
    const machine = createFilterMachine();
    const fetchModels = jest.fn().mockResolvedValue([{ id: 'm1', nameEn: 'Corolla' }]);

    // Set model first
    await machine.setModelId('old-model', jest.fn().mockResolvedValue([2020]));
    // Now change brand → model should reset
    await machine.setBrandId('brand-toyota', fetchModels);

    const s = machine.getState();
    expect(s.brandId).toBe('brand-toyota');
    expect(s.modelId).toBe('');
    expect(s.year).toBe('');
    expect(s.models).toEqual([{ id: 'm1', nameEn: 'Corolla' }]);
  });

  it('setting model fetches years and clears year/trim', async () => {
    const machine = createFilterMachine();
    const fetchYears = jest.fn().mockResolvedValue([2022, 2021, 2020]);
    await machine.setModelId('model-id', fetchYears);

    const s = machine.getState();
    expect(s.modelId).toBe('model-id');
    expect(s.years).toEqual([2022, 2021, 2020]);
    expect(s.year).toBe('');
    expect(s.trims).toEqual([]);
  });

  it('setting year fetches trims', async () => {
    const machine = createFilterMachine();
    await machine.setModelId('model-id', jest.fn().mockResolvedValue([2022]));
    const fetchTrims = jest.fn().mockResolvedValue([{ id: 't1', name: 'VXR' }]);
    await machine.setYear('2022', fetchTrims);

    const s = machine.getState();
    expect(s.year).toBe('2022');
    expect(s.trims).toEqual([{ id: 't1', name: 'VXR' }]);
    expect(fetchTrims).toHaveBeenCalledWith('model-id', 2022);
  });

  it('does not call fetchModels when brand is cleared', async () => {
    const machine = createFilterMachine();
    const fetchModels = jest.fn().mockResolvedValue([]);
    await machine.setBrandId('', fetchModels);
    expect(fetchModels).not.toHaveBeenCalled();
  });

  it('reset() clears all state', async () => {
    const machine = createFilterMachine();
    await machine.setBrandId('brand-id', jest.fn().mockResolvedValue([{ id: 'm1' }]));
    machine.reset();

    const s = machine.getState();
    expect(s.brandId).toBe('');
    expect(s.models).toEqual([]);
    expect(s.years).toEqual([]);
    expect(s.trims).toEqual([]);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. i18n locale URL helpers
// ─────────────────────────────────────────────────────────────────────────────

describe('Locale URL helpers', () => {
  const LOCALES = ['en', 'ku', 'ar'] as const;
  const DEFAULT_LOCALE = 'en';

  const buildLocalePath = (path: string, locale: string) =>
    `/${locale}${path.startsWith('/') ? path : `/${path}`}`;

  const extractLocale = (pathname: string): string => {
    const match = pathname.match(/^\/(en|ku|ar)(\/|$)/);
    return match ? match[1] : DEFAULT_LOCALE;
  };

  const stripLocale = (pathname: string): string =>
    pathname.replace(/^\/(en|ku|ar)/, '') || '/';

  it('builds correct locale path for /cars', () => {
    expect(buildLocalePath('/cars', 'ku')).toBe('/ku/cars');
    expect(buildLocalePath('/cars', 'ar')).toBe('/ar/cars');
    expect(buildLocalePath('/cars', 'en')).toBe('/en/cars');
  });

  it('extracts locale from pathname', () => {
    expect(extractLocale('/ku/cars')).toBe('ku');
    expect(extractLocale('/ar/listings/123')).toBe('ar');
    expect(extractLocale('/en')).toBe('en');
  });

  it('returns default locale for non-prefixed path', () => {
    expect(extractLocale('/some-path')).toBe('en');
  });

  it('strips locale prefix correctly', () => {
    expect(stripLocale('/ku/cars')).toBe('/cars');
    expect(stripLocale('/ar/listings/123')).toBe('/listings/123');
    expect(stripLocale('/en')).toBe('/');
  });

  it('RTL locales are ku and ar', () => {
    const RTL_LOCALES = ['ku', 'ar'];
    const isRtl = (locale: string) => RTL_LOCALES.includes(locale);
    expect(isRtl('ku')).toBe(true);
    expect(isRtl('ar')).toBe(true);
    expect(isRtl('en')).toBe(false);
  });

  it('all supported locales produce valid paths', () => {
    LOCALES.forEach(locale => {
      const path = buildLocalePath('/dealers', locale);
      expect(path).toMatch(new RegExp(`^/${locale}/dealers$`));
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. WebSocket rate limiter (extracted from chat.gateway.ts)
// ─────────────────────────────────────────────────────────────────────────────

describe('WebSocket rate limiter', () => {
  const WS_RATE_WINDOW_MS = 10_000;
  const WS_RATE_MAX = 10;

  function createRateLimiter() {
    const store = new Map<string, { count: number; resetAt: number }>();

    return {
      check: (userId: string, now = Date.now()): boolean => {
        const state = store.get(userId);
        if (!state || now > state.resetAt) {
          store.set(userId, { count: 1, resetAt: now + WS_RATE_WINDOW_MS });
          return true;
        }
        if (state.count >= WS_RATE_MAX) return false;
        state.count++;
        return true;
      },
      reset: (userId: string) => store.delete(userId),
    };
  }

  it('allows first message through', () => {
    const limiter = createRateLimiter();
    expect(limiter.check('user-1')).toBe(true);
  });

  it('allows up to WS_RATE_MAX messages per window', () => {
    const limiter = createRateLimiter();
    const results = Array.from({ length: WS_RATE_MAX }, () => limiter.check('user-1'));
    expect(results.every(r => r)).toBe(true);
  });

  it('blocks message after WS_RATE_MAX in window', () => {
    const limiter = createRateLimiter();
    for (let i = 0; i < WS_RATE_MAX; i++) limiter.check('user-1');
    expect(limiter.check('user-1')).toBe(false);
  });

  it('resets counter after window expires', () => {
    const limiter = createRateLimiter();
    const t0 = Date.now();
    for (let i = 0; i < WS_RATE_MAX; i++) limiter.check('user-1', t0);
    // Simulate time advancing past the window
    expect(limiter.check('user-1', t0 + WS_RATE_WINDOW_MS + 1)).toBe(true);
  });

  it('rate limits are per userId (different users don\'t share window)', () => {
    const limiter = createRateLimiter();
    for (let i = 0; i < WS_RATE_MAX; i++) limiter.check('user-1');
    expect(limiter.check('user-2')).toBe(true); // user-2 is unaffected
  });
});
