// apps/api/src/__tests__/unit/payments.service.spec.ts

import { Test, TestingModule } from '@nestjs/testing';
import { PaymentsService } from '../../modules/payments/payments.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import {
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PaymentPlan, PaymentCurrency, PaymentStatus } from '../../modules/payments/dto/payment.dto';

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockPrisma = {
  payment: {
    findMany:   jest.fn(),
    findUnique: jest.fn(),
    findFirst:  jest.fn(),
    create:     jest.fn(),
    update:     jest.fn(),
    updateMany: jest.fn(),
  },
  transactionLog: { create: jest.fn() },
  webhookEvent:   { findUnique: jest.fn(), create: jest.fn() },
  subscription:   {
    findUnique: jest.fn(),
    upsert:     jest.fn(),
    update:     jest.fn(),
    updateMany: jest.fn(),
  },
};

jest.mock('stripe', () => {
  return jest.fn().mockImplementation(() => ({
    paymentIntents: {
      create:   jest.fn().mockResolvedValue({ id: 'pi_test', client_secret: 'cs_test', status: 'requires_payment_method' }),
      retrieve: jest.fn(),
      confirm:  jest.fn(),
    },
    refunds:       { create: jest.fn().mockResolvedValue({ id: 're_test', status: 'pending' }) },
    subscriptions: { update: jest.fn() },
    webhooks:      { constructEvent: jest.fn() },
  }));
});

const mockConfig = {
  get: jest.fn((key: string) => {
    if (key === 'STRIPE_SECRET_KEY') return 'sk_test_xxx';
    return undefined;
  }),
};

// Gateway mocks
const mockZainCash   = { name: 'zaincash',   createCharge: jest.fn(), verifyWebhook: jest.fn(), refund: jest.fn() };
const mockFastPay    = { name: 'fastpay',    createCharge: jest.fn(), verifyWebhook: jest.fn(), refund: jest.fn() };
const mockQiCard     = { name: 'qicard',     createCharge: jest.fn(), verifyWebhook: jest.fn(), refund: jest.fn() };
const mockAsiaHawala = {
  name: 'asiahawala',
  createCharge:   jest.fn(),
  verifyWebhook:  jest.fn(),
  refund:         jest.fn(),
  initiateCharge: jest.fn(),
  confirmOTP:     jest.fn(),
};

// ─── Suite ────────────────────────────────────────────────────────────────────

describe('PaymentsService', () => {
  let service: PaymentsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsService,
        { provide: PrismaService,   useValue: mockPrisma },
        { provide: ConfigService,   useValue: mockConfig },
        { provide: 'ZainCashGateway',   useValue: mockZainCash },
        { provide: 'FastPayGateway',    useValue: mockFastPay },
        { provide: 'QiCardGateway',     useValue: mockQiCard },
        { provide: 'AsiaHawalaGateway', useValue: mockAsiaHawala },
      ],
    })
    .overrideProvider('ZainCashGateway').useValue(mockZainCash)
    .overrideProvider('FastPayGateway').useValue(mockFastPay)
    .overrideProvider('QiCardGateway').useValue(mockQiCard)
    .overrideProvider('AsiaHawalaGateway').useValue(mockAsiaHawala)
    .compile();

    service = module.get<PaymentsService>(PaymentsService);

    // Inject gateway mocks directly (bypasses NestJS DI for simplicity)
    (service as any).zainCash   = mockZainCash;
    (service as any).fastPay    = mockFastPay;
    (service as any).qiCard     = mockQiCard;
    (service as any).asiaHawala = mockAsiaHawala;

    jest.clearAllMocks();

    // Reset Stripe mock defaults
    const StripeMock = require('stripe');
    const instance = new StripeMock();
    instance.paymentIntents.create.mockResolvedValue({
      id: 'pi_test', client_secret: 'cs_test', status: 'requires_payment_method',
    });
  });

  // ── Amount resolution ─────────────────────────────────────────────────────

  describe('createPaymentIntent — Stripe (USD)', () => {
    it('resolves server-side canonical amount — client cannot supply price', async () => {
      (mockPrisma.payment as any).findFirst = jest.fn().mockResolvedValue(null);
      (mockPrisma.payment as any).create = jest.fn().mockResolvedValue({
        id: 'pay_1', userId: 'u1', plan: PaymentPlan.BASIC,
        amount: 19.99, currency: PaymentCurrency.USD,
        status: PaymentStatus.PENDING, gatewayId: 'pi_test',
      });
      mockPrisma.transactionLog.create.mockResolvedValue({});

      const result = await service.createPaymentIntent('u1', {
        plan: PaymentPlan.BASIC,
        currency: PaymentCurrency.USD,
      });

      // FIX: narrow union type with 'clientSecret' in result
      expect('clientSecret' in result).toBe(true);
      if ('clientSecret' in result) {
        expect(result.clientSecret).toBe('cs_test');
      }
    });

    it('reuses existing pending intent if still usable', async () => {
      (mockPrisma.payment as any).findFirst = jest.fn().mockResolvedValue({
        id: 'pay_existing', gatewayId: 'pi_existing',
      });

      const StripeMock = require('stripe');
      const instance = new StripeMock();
      instance.paymentIntents.retrieve.mockResolvedValue({
        id: 'pi_existing', client_secret: 'cs_existing', status: 'requires_payment_method',
      });
      (service as any).stripe = instance;

      const result = await service.createPaymentIntent('u1', {
        plan: PaymentPlan.BASIC,
        currency: PaymentCurrency.USD,
      });

      expect('clientSecret' in result).toBe(true);
      if ('clientSecret' in result) {
        expect(result.clientSecret).toBe('cs_existing');
        expect(result.paymentId).toBe('pay_existing');
      }
    });
  });

  // ── IDOR guard ────────────────────────────────────────────────────────────

  describe('getPaymentById', () => {
    it('returns payment when userId matches', async () => {
      mockPrisma.payment.findUnique.mockResolvedValue({ id: 'pay_1', userId: 'u1', transactionLogs: [] });
      const result = await service.getPaymentById('pay_1', 'u1');
      expect(result.id).toBe('pay_1');
    });

    it('throws ForbiddenException when userId does not match (IDOR)', async () => {
      mockPrisma.payment.findUnique.mockResolvedValue({ id: 'pay_1', userId: 'u_owner' });
      await expect(service.getPaymentById('pay_1', 'u_attacker')).rejects.toThrow(ForbiddenException);
    });

    it('throws NotFoundException when payment does not exist', async () => {
      mockPrisma.payment.findUnique.mockResolvedValue(null);
      await expect(service.getPaymentById('pay_nope', 'u1')).rejects.toThrow(NotFoundException);
    });
  });

  // ── Refund guards ─────────────────────────────────────────────────────────

  describe('initiateRefund', () => {
    const basePayment = {
      id: 'pay_1', userId: 'u1',
      status: PaymentStatus.COMPLETED,
      gatewayId: 'pi_test',
      refundedAt: null,
      amount: 19.99,
      currency: 'USD',
      gateway: 'stripe',
    };

    it('rejects refund on non-completed payment', async () => {
      mockPrisma.payment.findUnique.mockResolvedValue({ ...basePayment, status: PaymentStatus.PENDING });
      await expect(service.initiateRefund('u1', { paymentId: 'pay_1' })).rejects.toThrow(BadRequestException);
    });

    it('rejects double-refund', async () => {
      mockPrisma.payment.findUnique.mockResolvedValue({ ...basePayment, refundedAt: new Date() });
      await expect(service.initiateRefund('u1', { paymentId: 'pay_1' })).rejects.toThrow(ConflictException);
    });

    it('blocks refund by non-owner (IDOR)', async () => {
      mockPrisma.payment.findUnique.mockResolvedValue(basePayment);
      await expect(service.initiateRefund('u_attacker', { paymentId: 'pay_1' })).rejects.toThrow(ForbiddenException);
    });

    it('allows admin to refund any payment', async () => {
      mockPrisma.payment.findUnique.mockResolvedValue(basePayment);
      mockPrisma.transactionLog.create.mockResolvedValue({});
      const result = await service.initiateRefund('admin_id', { paymentId: 'pay_1' }, true);
      expect(result.refundId).toBe('re_test');
    });

    it('rejects partial refund exceeding original amount', async () => {
      mockPrisma.payment.findUnique.mockResolvedValue(basePayment);
      await expect(
        service.initiateRefund('u1', { paymentId: 'pay_1', amount: 99999 }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ── Webhook idempotency ───────────────────────────────────────────────────

  describe('handleWebhook', () => {
    it('skips already-processed events', async () => {
      mockPrisma.webhookEvent.findUnique.mockResolvedValue({ id: 'we_1' });
      const result = await service.handleWebhook({
        id: 'evt_dup', type: 'payment_intent.succeeded', data: { object: {} },
      } as any);
      expect(result.skipped).toBe(true);
    });

    it('records event after processing', async () => {
      mockPrisma.webhookEvent.findUnique.mockResolvedValue(null);
      mockPrisma.webhookEvent.create.mockResolvedValue({});
      mockPrisma.payment.findUnique.mockResolvedValue(null);

      await service.handleWebhook({
        id: 'evt_new',
        type: 'payment_intent.succeeded',
        data: { object: { id: 'pi_test' } },
      } as any);

      expect(mockPrisma.webhookEvent.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ gatewayId: 'evt_new' }) }),
      );
    });
  });

  // ── Retry scheduling ──────────────────────────────────────────────────────

  describe('retryFailedPayments', () => {
    it('skips payments with no gatewayId', async () => {
      mockPrisma.payment.findMany.mockResolvedValue([
        { id: 'pay_1', gatewayId: null, retryCount: 0, currency: 'USD', amount: 19.99 },
      ]);
      const result = await service.retryFailedPayments();
      expect(result.processed).toBe(1);
    });

    it('marks payment as permanently failed after max retries', async () => {
      mockPrisma.payment.findMany.mockResolvedValue([
        { id: 'pay_1', gatewayId: 'pi_test', retryCount: 3, currency: 'USD', amount: 19.99 },
      ]);
      mockPrisma.payment.update.mockResolvedValue({});
      mockPrisma.transactionLog.create.mockResolvedValue({});

      const StripeMock = require('stripe');
      const instance = new StripeMock();
      instance.paymentIntents.confirm.mockRejectedValue(new Error('Card declined'));
      (service as any).stripe = instance;

      await service.retryFailedPayments();

      expect(mockPrisma.payment.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ nextRetryAt: null }) }),
      );
    });
  });
});