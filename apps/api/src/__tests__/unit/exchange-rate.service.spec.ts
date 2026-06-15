// apps/api/src/__tests__/unit/exchange-rate.service.spec.ts

import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { ExchangeRateService } from '../../common/currency/exchange-rate.service';
import { CacheService } from '../../common/cache/cache.service';
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockCacheService = {
  getOrSet: jest.fn(),
  get: jest.fn(),
  set: jest.fn(),
};

const mockConfigService = {
  get: jest.fn((key: string, def?: unknown) => {
    if (key === 'EXCHANGE_RATE_API_KEY') return 'test-api-key';
    return def;
  }),
};

const MOCK_API_RESPONSE = {
  data: {
    result: 'success',
    time_last_update_utc: 'Mon, 15 Jan 2025 00:00:00 +0000',
    conversion_rates: {
      USD: 1,
      IQD: 1310,
      AED: 3.674,
      CNY: 7.24,
      EUR: 0.92,
      GBP: 0.79,
    },
  },
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('ExchangeRateService', () => {
  let service: ExchangeRateService;

  beforeEach(async () => {
    jest.clearAllMocks();

    // Default: cache miss, so factory is called
    mockCacheService.getOrSet.mockImplementation(
      (_key: string, factory: () => Promise<unknown>) => factory(),
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExchangeRateService,
        { provide: ConfigService, useValue: mockConfigService },
        { provide: CacheService, useValue: mockCacheService },
      ],
    }).compile();

    service = module.get<ExchangeRateService>(ExchangeRateService);
  });

  // ── getAllRates ─────────────────────────────────────────────────────────────

  describe('getAllRates()', () => {
    it('returns live rates when API is available', async () => {
      mockedAxios.get.mockResolvedValueOnce(MOCK_API_RESPONSE);

      const rates = await service.getAllRates();

      expect(rates.source).toBe('live');
      expect(rates.base).toBe('USD');
      expect(rates.rates.IQD).toBe(1310);
      expect(rates.rates.AED).toBe(3.674);
      expect(rates.rates.CNY).toBe(7.24);
    });

    it('returns fallback rates when API fails', async () => {
      mockedAxios.get.mockRejectedValueOnce(new Error('Network error'));

      const rates = await service.getAllRates();

      expect(rates.source).toBe('fallback');
      expect(rates.rates.IQD).toBe(1310); // matches FALLBACK_RATES
    });

    it('returns fallback rates when API key is missing', async () => {
      mockConfigService.get.mockReturnValue(undefined);

      // Re-create service without API key
      const module = await Test.createTestingModule({
        providers: [
          ExchangeRateService,
          { provide: ConfigService, useValue: mockConfigService },
          { provide: CacheService, useValue: mockCacheService },
        ],
      }).compile();
      const svcNoKey = module.get<ExchangeRateService>(ExchangeRateService);

      const rates = await svcNoKey.getAllRates();
      expect(rates.source).toBe('fallback');
      expect(mockedAxios.get).not.toHaveBeenCalled();
    });

    it('returns fallback rates when API returns non-success result', async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: { result: 'error', 'error-type': 'invalid-key' },
      });

      const rates = await service.getAllRates();
      expect(rates.source).toBe('fallback');
    });

    it('uses cache when available (cache hit)', async () => {
      const cachedRates = { ...MOCK_API_RESPONSE.data, source: 'live', updatedAt: new Date().toISOString() };
      mockCacheService.getOrSet.mockResolvedValueOnce(cachedRates);

      await service.getAllRates();

      // axios should NOT be called since cache returned data
      expect(mockedAxios.get).not.toHaveBeenCalled();
    });
  });

  // ── getRate ────────────────────────────────────────────────────────────────

  describe('getRate()', () => {
    beforeEach(() => {
      mockedAxios.get.mockResolvedValue(MOCK_API_RESPONSE);
    });

    it('returns 1 for same currency', async () => {
      const rate = await service.getRate('USD', 'USD');
      expect(rate).toBe(1);
    });

    it('correctly converts USD to IQD', async () => {
      const rate = await service.getRate('USD', 'IQD');
      expect(rate).toBe(1310);
    });

    it('correctly converts IQD to USD', async () => {
      const rate = await service.getRate('IQD', 'USD');
      expect(rate).toBeCloseTo(1 / 1310, 5);
    });

    it('correctly converts AED to IQD via USD base', async () => {
      // 1 AED = (1/3.674) USD = (1/3.674) * 1310 IQD ≈ 356.8
      const rate = await service.getRate('AED', 'IQD');
      expect(rate).toBeCloseTo(1310 / 3.674, 1);
    });
  });

  // ── convertAmount ──────────────────────────────────────────────────────────

  describe('convertAmount()', () => {
    beforeEach(() => {
      mockedAxios.get.mockResolvedValue(MOCK_API_RESPONSE);
    });

    it('converts $100 USD to 131,000 IQD', async () => {
      const result = await service.convertAmount(100, 'USD', 'IQD');
      expect(result).toBe(131000);
    });

    it('converts 1,310,000 IQD to approximately $1,000', async () => {
      const result = await service.convertAmount(1_310_000, 'IQD', 'USD');
      expect(result).toBeCloseTo(1000, 0);
    });

    it('returns same amount for same currency', async () => {
      const result = await service.convertAmount(500, 'USD', 'USD');
      expect(result).toBe(500);
    });
  });
});
