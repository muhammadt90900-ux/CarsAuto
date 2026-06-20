/**
 * apps/api/src/__tests__/fixtures/factories.ts
 * Deterministic test-data factories — no external dependencies.
 */

// ── Users ─────────────────────────────────────────────────────────────────────

export const makeUser = (overrides: Record<string, any> = {}) => ({
  id: 'user-uuid-1111',
  name: 'Test User',
  email: 'test@carsauto.iq',
  password: '$2b$12$mocked.bcrypt.hash.placeholder.value',
  phone: '+9647501234567',
  role: 'USER' as const,
  verified: true,
  emailVerified: new Date('2024-01-01T00:00:00Z'),
  locale: 'ku',
  banned: false,
  deletedAt: null,
  failedLoginAttempts: 0,
  lockedUntil: null,
  passwordChangedAt: null,
  createdAt: new Date('2024-01-01T00:00:00Z'),
  updatedAt: new Date('2024-01-01T00:00:00Z'),
  ...overrides,
});

export const makeDealer = (o: Record<string, any> = {}) =>
  makeUser({ id: 'dealer-uuid-2222', role: 'DEALER', email: 'dealer@carsauto.iq', ...o });

export const makeAdmin = (o: Record<string, any> = {}) =>
  makeUser({ id: 'admin-uuid-9999', role: 'ADMIN', email: 'admin@carsauto.iq', ...o });

export const makeUnverifiedUser = (o: Record<string, any> = {}) =>
  makeUser({ verified: false, emailVerified: null, ...o });

export const makeLockedUser = (o: Record<string, any> = {}) =>
  makeUser({
    failedLoginAttempts: 5,
    lockedUntil: new Date(Date.now() + 10 * 60 * 1000), // 10 min ahead
    ...o,
  });

// ── Listings ──────────────────────────────────────────────────────────────────

export const makeListing = (overrides: Record<string, any> = {}) => ({
  id: 'listing-uuid-5555',
  type: 'CAR',
  status: 'ACTIVE',
  titleKu: 'تۆیۆتا لاندکروزەر',
  titleAr: 'تويوتا لاندكروزر',
  titleEn: 'Toyota Land Cruiser',
  titleZh: null,
  descriptionKu: 'تۆیۆتای باش',
  price: 45000,
  currency: 'USD',
  negotiable: true,
  featured: false,
  views: 0,
  userId: 'user-uuid-1111',
  locationId: 'loc-uuid-1',
  categoryId: null,
  createdAt: new Date('2024-06-01T00:00:00Z'),
  updatedAt: new Date('2024-06-01T00:00:00Z'),
  ...overrides,
});

export const makePendingListing = (o: Record<string, any> = {}) =>
  makeListing({ id: 'listing-uuid-pending', status: 'PENDING', ...o });

// ── Vehicles ──────────────────────────────────────────────────────────────────

export const makeBrand = (overrides: Record<string, any> = {}) => ({
  id: 'brand-uuid-toyota',
  nameEn: 'Toyota',
  nameAr: 'تويوتا',
  nameKu: 'تۆیۆتا',
  slug: 'toyota',
  logoUrl: 'https://cdn.carsauto.iq/brands/toyota.svg',
  isActive: true,
  _count: { listingSpecs: 42 },
  ...overrides,
});

export const makeModel = (overrides: Record<string, any> = {}) => ({
  id: 'model-uuid-landcruiser',
  nameEn: 'Land Cruiser',
  nameAr: 'لاند كروزر',
  nameKu: 'لاندکروزەر',
  slug: 'land-cruiser',
  brandId: 'brand-uuid-toyota',
  isActive: true,
  _count: { listingSpecs: 12 },
  ...overrides,
});

export const makeTrim = (overrides: Record<string, any> = {}) => ({
  id: 'trim-uuid-vxr',
  name: 'VXR',
  fuelType: 'PETROL',
  transmission: 'AUTOMATIC',
  drivetrain: 'AWD',
  engineCC: 4608,
  engineLabel: '4.6L V8',
  isActive: true,
  generation: { id: 'gen-uuid-1', yearFrom: 2008, yearTo: 2021 },
  ...overrides,
});

// ── Payments ──────────────────────────────────────────────────────────────────

export const makePayment = (overrides: Record<string, any> = {}) => ({
  id: 'payment-uuid-7777',
  userId: 'user-uuid-1111',
  plan: 'FEATURED_LISTING',
  amount: 29.99,
  currency: 'USD',
  status: 'pending',
  createdAt: new Date('2024-06-01T00:00:00Z'),
  ...overrides,
});

// ── JWT ───────────────────────────────────────────────────────────────────────

export const makeJwtPayload = (overrides: Record<string, any> = {}) => ({
  sub: 'user-uuid-1111',
  email: 'test@carsauto.iq',
  role: 'USER',
  iss: 'car-platform',
  aud: 'car-platform-client',
  iat: Math.floor(Date.now() / 1000) - 60,
  exp: Math.floor(Date.now() / 1000) + 3540,
  ...overrides,
});

// ── Mock service factories ────────────────────────────────────────────────────

export const mockPrisma = () => ({
  user: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
  listing: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
  carBrand:   { findMany: jest.fn(), findUnique: jest.fn() },
  carModel:   { findMany: jest.fn() },
  carTrim:    { findMany: jest.fn() },
  listingVehicleSpec: { findMany: jest.fn() },
  payment:    { findUnique: jest.fn(), findMany: jest.fn(), create: jest.fn(), update: jest.fn() },
  refreshToken: {
    create: jest.fn(), findFirst: jest.fn(), findUnique: jest.fn(),
    update: jest.fn(), updateMany: jest.fn(), deleteMany: jest.fn(), count: jest.fn(),
  },
  passwordResetToken: {
    findUnique: jest.fn(), create: jest.fn(), update: jest.fn(), delete: jest.fn(), deleteMany: jest.fn(),
  },
  emailVerificationToken: {
    findUnique: jest.fn(), create: jest.fn(), update: jest.fn(), deleteMany: jest.fn(),
  },
  auditLog: { create: jest.fn() },
  dealer: { findUnique: jest.fn(), findMany: jest.fn(), create: jest.fn(), update: jest.fn(), delete: jest.fn(), count: jest.fn() },
  chat: {
    findUnique: jest.fn(), findFirst: jest.fn(), findMany: jest.fn(), create: jest.fn(),
    update: jest.fn(), delete: jest.fn(), count: jest.fn(),
  },
  message: {
    findUnique: jest.fn(), findMany: jest.fn(), create: jest.fn(),
    update: jest.fn(), delete: jest.fn(), count: jest.fn(),
  },
  $queryRaw: jest.fn(),
  $transaction: jest.fn((ops: any) => Array.isArray(ops) ? Promise.all(ops) : ops()),
});

export const mockCache = () => ({
  get: jest.fn().mockReturnValue(null),
  set: jest.fn(),
  del: jest.fn(),
  stats: jest.fn().mockReturnValue({ size: 0, inflight: 0 }),
  getOrSet: jest.fn().mockImplementation((_key: string, factory: () => any) => factory()),
});

export const mockJwt = () => ({
  sign: jest.fn().mockReturnValue('mock.access.token'),
  signAsync: jest.fn().mockResolvedValue('mock.access.token'),
  verify: jest.fn().mockReturnValue(makeJwtPayload()),
  verifyAsync: jest.fn().mockResolvedValue(makeJwtPayload()),
  decode: jest.fn().mockReturnValue(makeJwtPayload()),
});

export const mockConfig = () => ({
  get: jest.fn().mockImplementation((key: string) => ({
    JWT_SECRET: 'test-jwt-secret-at-least-32-chars!!',
    JWT_REFRESH_SECRET: 'test-refresh-secret-at-least-32!!',
    JWT_EXPIRES_IN: '15m',
    JWT_REFRESH_EXPIRES_IN: '7d',
    FRONTEND_URL: 'http://localhost:3000',
    NODE_ENV: 'test',
  }[key])),
  getOrThrow: jest.fn().mockImplementation(function(this: { get: (k: string) => string | undefined }, key: string) {
    const val = this.get(key);
    if (val == null) throw new Error(`Missing env: ${key}`);
    return val;
  }),
});

export const mockEmail = () => ({
  sendVerificationEmail: jest.fn().mockResolvedValue(undefined),
  sendPasswordResetEmail: jest.fn().mockResolvedValue(undefined),
  sendWelcomeEmail: jest.fn().mockResolvedValue(undefined),
  sendEmail: jest.fn().mockResolvedValue(undefined),
});

export const mockExecutionContext = (user?: any, body?: any, query?: any) => ({
  switchToHttp: () => ({
    getRequest: () => ({
      user: user ?? makeJwtPayload(),
      body: body ?? {},
      query: query ?? {},
      headers: {},
      ip: '127.0.0.1',
      cookies: {},
    }),
    getResponse: () => ({
      cookie: jest.fn(),
      clearCookie: jest.fn(),
    }),
  }),
});
