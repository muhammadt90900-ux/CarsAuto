/**
 * apps/api/src/__tests__/unit/feature2-openai.spec.ts
 *
 * Unit tests for Feature 2 — OpenAI Integration
 * All HTTP calls to OpenAI are mocked.
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { OpenAiService } from '../../common/ai/openai.service';
import { AiService } from '../../modules/ai/ai.service';
import { getQueueToken } from '@nestjs/bullmq';
import { TranslationService } from '../../modules/ai/translation/translation.service';

// ── Mock OpenAI SDK ────────────────────────────────────────────────────────────
const mockEmbeddingsCreate = jest.fn();
const mockModerationsCreate = jest.fn();
const mockChatCreate = jest.fn();

jest.mock('openai', () => {
  return {
    default: jest.fn().mockImplementation(() => ({
      embeddings: { create: mockEmbeddingsCreate },
      moderations: { create: mockModerationsCreate },
      chat: { completions: { create: mockChatCreate } },
    })),
  };
});

// ── Helpers ────────────────────────────────────────────────────────────────────
const makeConfigService = (overrides: Record<string, string> = {}) =>
  ({
    get: (key: string, fallback?: string) =>
      overrides[key] ?? { OPENAI_API_KEY: 'sk-test', OPENAI_ENABLED: 'true' }[key] ?? fallback,
  } as unknown as ConfigService);

const makePrismaService = (listingsData: any[] = []) =>
  ({
    listing: {
      findMany: jest.fn().mockResolvedValue(listingsData),
      findUnique: jest.fn().mockResolvedValue(null),
    },
  } as any);

// ── OpenAiService tests ────────────────────────────────────────────────────────
describe('OpenAiService', () => {
  let service: OpenAiService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OpenAiService,
        { provide: ConfigService, useValue: makeConfigService() },
      ],
    }).compile();

    service = module.get(OpenAiService);
    jest.clearAllMocks();
  });

  describe('embed()', () => {
    it('returns 1536-dimension array on success', async () => {
      const fakeEmbedding = Array(1536).fill(0.1);
      mockEmbeddingsCreate.mockResolvedValueOnce({
        data: [{ embedding: fakeEmbedding, index: 0 }],
      });

      const result = await service.embed('Toyota Camry 2020');
      expect(result).toHaveLength(1536);
      expect(mockEmbeddingsCreate).toHaveBeenCalledTimes(1);
    });

    it('returns [] on API error (graceful fallback)', async () => {
      mockEmbeddingsCreate.mockRejectedValueOnce(new Error('API rate limit'));
      const result = await service.embed('test text');
      expect(result).toEqual([]);
    });

    it('returns [] for empty input without calling API', async () => {
      const result = await service.embed('');
      expect(result).toEqual([]);
      expect(mockEmbeddingsCreate).not.toHaveBeenCalled();
    });
  });

  describe('moderate()', () => {
    it('returns flagged=true when content is harmful', async () => {
      mockModerationsCreate.mockResolvedValueOnce({
        results: [{
          flagged: true,
          categories: { hate: true, harassment: false, violence: false, sexual: false, 'self-harm': false, illicit: false },
          category_scores: { hate: 0.95 },
        }],
      });

      const result = await service.moderate('harmful text');
      expect(result.flagged).toBe(true);
      expect(result.categories.hate).toBe(true);
    });

    it('returns safe fallback on API error', async () => {
      mockModerationsCreate.mockRejectedValueOnce(new Error('timeout'));
      const result = await service.moderate('any text');
      expect(result.flagged).toBe(false);
    });
  });

  describe('translateListing()', () => {
    it('returns translated fields from GPT JSON response', async () => {
      mockChatCreate.mockResolvedValueOnce({
        choices: [{
          message: {
            content: JSON.stringify({
              titleAr: 'تويوتا كامري',
              titleEn: 'Toyota Camry',
              titleZh: '丰田凯美瑞',
              descriptionAr: 'وصف',
              descriptionEn: 'description',
              descriptionZh: '描述',
            }),
          },
        }],
      });

      const result = await service.translateListing('تۆیۆتا کامری', 'وەسفی');
      expect(result.titleEn).toBe('Toyota Camry');
      expect(result.titleAr).toBe('تويوتا كامري');
      expect(result.titleZh).toBe('丰田凯美瑞');
    });

    it('returns empty strings on API error (graceful fallback)', async () => {
      mockChatCreate.mockRejectedValueOnce(new Error('API error'));
      const result = await service.translateListing('test', 'desc');
      expect(result.titleEn).toBe('');
      expect(result.titleAr).toBe('');
    });
  });

  describe('disabled mode (OPENAI_ENABLED=false)', () => {
    it('returns fallback values without calling API', async () => {
      const disabledModule = await Test.createTestingModule({
        providers: [
          OpenAiService,
          { provide: ConfigService, useValue: makeConfigService({ OPENAI_ENABLED: 'false' }) },
        ],
      }).compile();
      const disabledService = disabledModule.get(OpenAiService);

      expect(await disabledService.embed('test')).toEqual([]);
      expect((await disabledService.moderate('test')).flagged).toBe(false);
      expect(mockEmbeddingsCreate).not.toHaveBeenCalled();
      expect(mockModerationsCreate).not.toHaveBeenCalled();
    });
  });
});

// ── AiService spam detection tests ────────────────────────────────────────────
describe('AiService.detectSpamFull()', () => {
  let service: AiService;

  beforeEach(async () => {
    mockModerationsCreate.mockResolvedValue({
      results: [{ flagged: false, categories: {}, category_scores: {} }],
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiService,
        OpenAiService,
        { provide: ConfigService, useValue: makeConfigService() },
        { provide: 'PrismaService', useValue: makePrismaService() },
      ],
    })
      .overrideProvider('PrismaService')
      .useValue(makePrismaService())
      .compile();

    service = module.get(AiService);
    jest.clearAllMocks();
  });

  it('flags text with phone numbers', async () => {
    mockModerationsCreate.mockResolvedValueOnce({
      results: [{ flagged: false, categories: {}, category_scores: {} }],
    });
    const result = await service.detectSpamFull('Call me: 07712345678');
    expect(result.reasons).toContain('phone_number_in_description');
    expect(result.score).toBeGreaterThan(0);
  });

  it('flags text with URLs', async () => {
    mockModerationsCreate.mockResolvedValueOnce({
      results: [{ flagged: false, categories: {}, category_scores: {} }],
    });
    const result = await service.detectSpamFull('Visit http://scam.com for deals');
    expect(result.reasons).toContain('url_in_description');
  });

  it('returns isSpam=true immediately when OpenAI moderation flags content', async () => {
    mockModerationsCreate.mockResolvedValueOnce({
      results: [{ flagged: true, categories: { hate: true }, category_scores: {} }],
    });
    const result = await service.detectSpamFull('hate content');
    expect(result.isSpam).toBe(true);
    expect(result.score).toBe(100);
  });

  it('does not flag clean listing text', async () => {
    mockModerationsCreate.mockResolvedValueOnce({
      results: [{ flagged: false, categories: {}, category_scores: {} }],
    });
    const result = await service.detectSpamFull(
      'Toyota Camry 2020, full option, 45,000 km, excellent condition, Baghdad',
    );
    expect(result.isSpam).toBe(false);
  });
});

// ── AiService price suggestion tests ──────────────────────────────────────────
describe('AiService.suggestPrice()', () => {
  it('returns high confidence for >= 10 comparables', async () => {
    const prices = Array(12).fill(null).map((_, i) => ({ price: 10000 + i * 500 }));
    const prisma = makePrismaService(prices);

    const module = await Test.createTestingModule({
      providers: [
        AiService,
        OpenAiService,
        { provide: ConfigService, useValue: makeConfigService() },
        { provide: 'PrismaService', useValue: prisma },
      ],
    })
      .overrideProvider('PrismaService')
      .useValue(prisma)
      .compile();

    const service = module.get(AiService);
    const result = await service.suggestPrice('Toyota', 'Camry', 2020, 50000);

    expect(result.confidence).toBe('high');
    expect(result.sampleSize).toBe(12);
    expect(result.suggested).toBeGreaterThan(0);
    expect(result.min).toBeLessThan(result.suggested);
    expect(result.max).toBeGreaterThan(result.suggested);
  });

  it('returns medium confidence for 3–9 comparables', async () => {
    const prices = [{ price: 9000 }, { price: 10000 }, { price: 11000 }, { price: 12000 }];
    const prisma = makePrismaService(prices);

    const module = await Test.createTestingModule({
      providers: [
        AiService,
        OpenAiService,
        { provide: ConfigService, useValue: makeConfigService() },
      ],
    })
      .overrideProvider('PrismaService' as any)
      .useValue(prisma)
      .compile();

    const service = module.get(AiService);
    const result = await service.suggestPrice('Kia', 'Sportage', 2019, 60000);
    expect(result.confidence).toBe('medium');
  });
});

// ── TranslationService tests ───────────────────────────────────────────────────
describe('TranslationService', () => {
  let service: TranslationService;
  const mockQueue = { add: jest.fn().mockResolvedValue({ id: 'job-1' }) };

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        TranslationService,
        { provide: getQueueToken('translations'), useValue: mockQueue },
      ],
    }).compile();

    service = module.get(TranslationService);
    jest.clearAllMocks();
  });

  it('enqueues a job with correct data', async () => {
    await service.queueTranslation('listing-123', 'تۆیۆتا کامری', 'وەسفی');

    expect(mockQueue.add).toHaveBeenCalledWith(
      'translate-listing',
      { listingId: 'listing-123', titleKu: 'تۆیۆتا کامری', descriptionKu: 'وەسفی' },
      expect.objectContaining({ attempts: 3 }),
    );
  });

  it('skips empty Kurdish title', async () => {
    await service.queueTranslation('listing-456', '', '');
    expect(mockQueue.add).not.toHaveBeenCalled();
  });
});
