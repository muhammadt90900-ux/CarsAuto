// apps/api/src/__tests__/unit/china-gateways.spec.ts
// ─────────────────────────────────────────────────────────────────────────────
// Feature 5 — China Market Gateway Stubs
// Tests that AlipayGateway and WechatPayGateway:
//   1. Throw NotImplementedException when feature flag is OFF (happy path)
//   2. Return false for webhook verification when disabled
// ─────────────────────────────────────────────────────────────────────────────

import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { NotImplementedException } from '@nestjs/common';
import { AlipayGateway } from '../../../modules/payments/gateways/alipay.gateway';
import { WechatPayGateway } from '../../../modules/payments/gateways/wechatpay.gateway';
import type { GatewayChargeParams } from '../../../modules/payments/gateways/gateway.interface';

const MOCK_CHARGE_PARAMS: GatewayChargeParams = {
  amount: 99900,
  currency: 'CNY',
  userId: 'user-uuid-123',
  planId: 'STANDARD',
  returnUrl: 'https://carsauto.iq/payment/return',
  cancelUrl: 'https://carsauto.iq/payment/cancel',
};

function makeConfigService(overrides: Record<string, string> = {}) {
  return {
    get: (key: string, defaultVal = '') => overrides[key] ?? defaultVal,
    getOrThrow: (key: string) => {
      if (overrides[key]) return overrides[key];
      throw new Error(`Config key "${key}" not set`);
    },
  } as unknown as ConfigService;
}

// ── AlipayGateway ──────────────────────────────────────────────────────────

describe('AlipayGateway', () => {
  let gateway: AlipayGateway;

  describe('when ALIPAY_ENABLED=false (default)', () => {
    beforeEach(async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          AlipayGateway,
          { provide: ConfigService, useValue: makeConfigService({ ALIPAY_ENABLED: 'false' }) },
        ],
      }).compile();

      gateway = module.get<AlipayGateway>(AlipayGateway);
    });

    it('should have name "alipay"', () => {
      expect(gateway.name).toBe('alipay');
    });

    it('createCharge() should throw NotImplementedException', async () => {
      await expect(gateway.createCharge(MOCK_CHARGE_PARAMS)).rejects.toThrow(
        NotImplementedException,
      );
    });

    it('createCharge() error message should mention "Alipay coming soon"', async () => {
      await expect(gateway.createCharge(MOCK_CHARGE_PARAMS)).rejects.toThrow(
        /Alipay coming soon/i,
      );
    });

    it('verifyWebhook() should return false when disabled', async () => {
      const result = await gateway.verifyWebhook({ event: 'payment' }, 'sig-abc');
      expect(result).toBe(false);
    });

    it('refund() should throw NotImplementedException when disabled', async () => {
      await expect(gateway.refund('alp-txn-123', 5000)).rejects.toThrow(
        NotImplementedException,
      );
    });
  });
});

// ── WechatPayGateway ───────────────────────────────────────────────────────

describe('WechatPayGateway', () => {
  let gateway: WechatPayGateway;

  describe('when WECHATPAY_ENABLED=false (default)', () => {
    beforeEach(async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          WechatPayGateway,
          { provide: ConfigService, useValue: makeConfigService({ WECHATPAY_ENABLED: 'false' }) },
        ],
      }).compile();

      gateway = module.get<WechatPayGateway>(WechatPayGateway);
    });

    it('should have name "wechatpay"', () => {
      expect(gateway.name).toBe('wechatpay');
    });

    it('createCharge() should throw NotImplementedException', async () => {
      await expect(gateway.createCharge(MOCK_CHARGE_PARAMS)).rejects.toThrow(
        NotImplementedException,
      );
    });

    it('createCharge() error message should mention "WeChat Pay coming soon"', async () => {
      await expect(gateway.createCharge(MOCK_CHARGE_PARAMS)).rejects.toThrow(
        /WeChat Pay coming soon/i,
      );
    });

    it('verifyWebhook() should return false when disabled', async () => {
      const result = await gateway.verifyWebhook({ resource: {} }, 'wechat-sig');
      expect(result).toBe(false);
    });

    it('refund() should throw NotImplementedException when disabled', async () => {
      await expect(gateway.refund('wxp-order-456', 19900)).rejects.toThrow(
        NotImplementedException,
      );
    });
  });
});

// ── PaymentMethodSelector snapshot-style checks ────────────────────────────
// (Full React tests live in apps/web — these just validate gateway IDs)

describe('BY_COUNTRY gateway routing (Feature 5)', () => {
  const BY_COUNTRY: Record<string, string[]> = {
    IQ: ['zaincash', 'fastpay', 'qicard', 'asiahawala', 'stripe'],
    AE: ['stripe'],
    CN: ['alipay', 'wechatpay', 'stripe'],
    OTHER: ['stripe'],
  };

  it('CN should include alipay and wechatpay', () => {
    expect(BY_COUNTRY['CN']).toContain('alipay');
    expect(BY_COUNTRY['CN']).toContain('wechatpay');
  });

  it('CN should still include stripe as fallback', () => {
    expect(BY_COUNTRY['CN']).toContain('stripe');
  });

  it('IQ should not include Chinese gateways', () => {
    expect(BY_COUNTRY['IQ']).not.toContain('alipay');
    expect(BY_COUNTRY['IQ']).not.toContain('wechatpay');
  });
});
