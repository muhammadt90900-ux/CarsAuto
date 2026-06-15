// apps/api/src/modules/payments/gateways/wechatpay.gateway.ts
// ─────────────────────────────────────────────────────────────────────────────
// WeChat Pay v3 — stub implementation.
// Set WECHATPAY_ENABLED=true + supply credentials when merchant account is
// approved by Tencent.
//
// Real API: https://api.mch.weixin.qq.com/v3/pay/transactions/native
// Auth:     WECHATPAY2-SHA256-RSA2048 request signing + response validation
// ─────────────────────────────────────────────────────────────────────────────

import { Injectable, NotImplementedException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  IGateway,
  GatewayChargeParams,
  GatewayChargeResult,
} from './gateway.interface';

@Injectable()
export class WechatPayGateway implements IGateway {
  readonly name = 'wechatpay';
  private readonly logger = new Logger(WechatPayGateway.name);
  private readonly enabled: boolean;

  constructor(private readonly config: ConfigService) {
    this.enabled = config.get<string>('WECHATPAY_ENABLED', 'false') === 'true';
  }

  /**
   * Create a WeChat Pay Native order (QR-code based).
   * Throws NotImplementedException until WECHATPAY_ENABLED=true.
   */
  async createCharge(_params: GatewayChargeParams): Promise<GatewayChargeResult> {
    if (!this.enabled) {
      throw new NotImplementedException(
        'WeChat Pay coming soon — set WECHATPAY_ENABLED=true once merchant account is approved.',
      );
    }

    // ── Live implementation (activated when WECHATPAY_ENABLED=true) ──────────
    //
    // const mchId      = this.config.getOrThrow<string>('WECHATPAY_MCH_ID');
    // const appId      = this.config.getOrThrow<string>('WECHATPAY_APP_ID');
    // const apiV3Key   = this.config.getOrThrow<string>('WECHATPAY_API_V3_KEY');
    // const serialNo   = this.config.getOrThrow<string>('WECHATPAY_SERIAL_NO');
    // const privateKey = this.config.getOrThrow<string>('WECHATPAY_PRIVATE_KEY');
    //
    // const tradeNo = `WXP_${_params.planId}_${Date.now()}`;
    // const body = {
    //   appid:        appId,
    //   mchid:        mchId,
    //   description:  `CarsAuto Plan ${_params.planId}`,
    //   out_trade_no: tradeNo,
    //   notify_url:   _params.returnUrl,
    //   amount: {
    //     total:    _params.amount,   // CNY in fen (1 CNY = 100 fen)
    //     currency: 'CNY',
    //   },
    // };
    //
    // // Build WECHATPAY2-SHA256-RSA2048 Authorization header
    // const timestamp  = Math.floor(Date.now() / 1000);
    // const nonce      = crypto.randomBytes(16).toString('hex');
    // const message    = `POST\n/v3/pay/transactions/native\n${timestamp}\n${nonce}\n${JSON.stringify(body)}\n`;
    // const signature  = crypto.createSign('sha256WithRSAEncryption').update(message).sign(privateKey, 'base64');
    // const authHeader = `WECHATPAY2-SHA256-RSA2048 mchid="${mchId}",nonce_str="${nonce}",timestamp="${timestamp}",serial_no="${serialNo}",signature="${signature}"`;
    //
    // const { data } = await axios.post(
    //   'https://api.mch.weixin.qq.com/v3/pay/transactions/native',
    //   body,
    //   { headers: { Authorization: authHeader, 'Content-Type': 'application/json' } },
    // );
    //
    // return {
    //   gatewayId:    tradeNo,
    //   checkoutData: { qrCode: data.code_url },
    //   status:       'pending',
    // };

    throw new NotImplementedException('WeChat Pay: live path unreachable (flag check failed)');
  }

  /**
   * Verify a WeChat Pay webhook (WECHATPAY2-SHA256-RSA2048).
   * Validates the Wechatpay-Signature header using the platform public key.
   */
  async verifyWebhook(_payload: unknown, _signature: string): Promise<boolean> {
    if (!this.enabled) return false;

    // TODO: download Tencent platform certificate, verify AEAD-AES-256-GCM
    // encrypted resource notification body.
    this.logger.warn('WeChat Pay webhook verification not yet implemented');
    return false;
  }

  /** Refund via WeChat Pay v3 Refunds API. */
  async refund(_gatewayId: string, _amount: number): Promise<void> {
    if (!this.enabled) {
      throw new NotImplementedException('WeChat Pay refunds not yet enabled');
    }
    // TODO: POST https://api.mch.weixin.qq.com/v3/refund/domestic/refunds
    throw new NotImplementedException('WeChat Pay refund: live path not yet implemented');
  }
}
