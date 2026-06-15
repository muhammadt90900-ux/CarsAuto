// apps/api/src/modules/payments/gateways/alipay.gateway.ts
// ─────────────────────────────────────────────────────────────────────────────
// Alipay Global — stub implementation.
// Set ALIPAY_ENABLED=true + supply ALIPAY_APP_ID / ALIPAY_PRIVATE_KEY when
// the merchant account is approved by Ant Group.
//
// Real API: https://global.alipay.com/docs/ac/global/create_order
// Auth:     RSA2 (SHA256WithRSA) signature over sorted param string
// ─────────────────────────────────────────────────────────────────────────────

import { Injectable, NotImplementedException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  IGateway,
  GatewayChargeParams,
  GatewayChargeResult,
} from './gateway.interface';

@Injectable()
export class AlipayGateway implements IGateway {
  readonly name = 'alipay';
  private readonly logger = new Logger(AlipayGateway.name);
  private readonly enabled: boolean;

  constructor(private readonly config: ConfigService) {
    this.enabled = config.get<string>('ALIPAY_ENABLED', 'false') === 'true';
  }

  /**
   * Create an Alipay Global charge.
   * Throws NotImplementedException until ALIPAY_ENABLED=true and credentials
   * are supplied.
   */
  async createCharge(_params: GatewayChargeParams): Promise<GatewayChargeResult> {
    if (!this.enabled) {
      throw new NotImplementedException(
        'Alipay coming soon — set ALIPAY_ENABLED=true once merchant account is approved.',
      );
    }

    // ── Live implementation (activated when ALIPAY_ENABLED=true) ──────────────
    //
    // const appId      = this.config.getOrThrow<string>('ALIPAY_APP_ID');
    // const privateKey = this.config.getOrThrow<string>('ALIPAY_PRIVATE_KEY');
    // const endpoint   = 'https://global.alipay.com/v1/payments/pay';
    //
    // const body = {
    //   appId,
    //   merchantTradeNo: `ALP_${_params.planId}_${Date.now()}`,
    //   productCode:     'AGREEMENT_PAYMENT',
    //   orderAmount:     { currency: _params.currency, value: String(_params.amount) },
    //   merchant:        { referenceMerchantId: appId },
    //   paymentNotifyUrl: _params.returnUrl,
    //   paymentRedirectUrl: _params.returnUrl,
    // };
    //
    // const signature = this.signRSA2(JSON.stringify(body), privateKey);
    //
    // const { data } = await axios.post(endpoint, body, {
    //   headers: {
    //     'Content-Type': 'application/json',
    //     'Signature':    `algorithm=RSA256,keyVersion=1,signature=${signature}`,
    //   },
    // });
    //
    // return {
    //   gatewayId:   data.paymentRequestId,
    //   redirectUrl: data.normalUrl,
    //   status:      'pending',
    // };

    throw new NotImplementedException('Alipay: live path unreachable (flag check failed)');
  }

  /**
   * Verify an inbound Alipay webhook signature.
   * Uses the Alipay public key to validate RSA2 signature.
   */
  async verifyWebhook(_payload: unknown, _signature: string): Promise<boolean> {
    if (!this.enabled) return false;

    // TODO: verify RSA2 signature using ALIPAY_PUBLIC_KEY
    // const publicKey = this.config.getOrThrow<string>('ALIPAY_PUBLIC_KEY');
    // return crypto.verify('sha256', Buffer.from(JSON.stringify(_payload)), publicKey, Buffer.from(_signature, 'base64'));
    this.logger.warn('Alipay webhook verification not yet implemented');
    return false;
  }

  /** Refund via Alipay Global Refund API. */
  async refund(_gatewayId: string, _amount: number): Promise<void> {
    if (!this.enabled) {
      throw new NotImplementedException('Alipay refunds not yet enabled');
    }
    // TODO: POST https://global.alipay.com/v1/payments/refund
    throw new NotImplementedException('Alipay refund: live path not yet implemented');
  }
}
