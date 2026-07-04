// apps/api/src/modules/payments/gateways/zaincash.gateway.ts
//
// ZainCash Iraq — HMAC-SHA256 signed redirect flow
// Currency: IQD (amounts in full dinars, NOT fils)

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import * as crypto from 'crypto';
import { IGateway, GatewayChargeParams, GatewayChargeResult } from './gateway.interface';

const ZAINCASH_API = 'https://api.zaincash.iq/transaction/init';

@Injectable()
export class ZainCashGateway implements IGateway {
  readonly name = 'zaincash';
  private readonly logger = new Logger(ZainCashGateway.name);

  constructor(private readonly config: ConfigService) {}

  async createCharge(params: GatewayChargeParams): Promise<GatewayChargeResult> {
    const merchantId = this.config.get<string>('ZAINCASH_MERCHANT_ID');
    const secret     = this.config.get<string>('ZAINCASH_SECRET');
    if (!merchantId || !secret) throw new Error('ZainCash not configured');

    const orderId    = `ZC-${params.userId.slice(0, 8)}-${Date.now()}`;
    const amountIQD  = Math.round(params.amount);

    // Signature: HMAC-SHA256 over concatenated fields
    const sigString  = `${amountIQD}CarsAuto Subscription${orderId}${params.returnUrl}${merchantId}`;
    const signature  = crypto.createHmac('sha256', secret).update(sigString).digest('hex');

    const body = {
      amount: amountIQD,
      serviceType: 'CarsAuto Subscription',
      msisdn: '',
      orderId,
      redirectUrl: params.returnUrl,
      terminalId: merchantId,
      signature,
    };

    this.logger.log(`ZainCash charge init: orderId=${orderId} amount=${amountIQD} IQD`);

    const res = await axios.post<{ transactionId: string; redirectUrl: string }>(
      ZAINCASH_API, body, { timeout: 15_000 },
    );

    return {
      gatewayId: res.data.transactionId,
      redirectUrl: res.data.redirectUrl,
      status: 'pending',
    };
  }

  /**
   * F4 FIX: Accept the raw Buffer from the webhook route (registered with
   * express.raw() in main.ts before json() middleware runs) — matches the
   * fastpay/asiahawala pattern.
   *
   * Previously: expected an already-parsed object and HMAC'd a concatenation
   * of individual fields (`id`+`status`+`amount`+`orderId`) read off of it.
   * Since the route delivers a raw Buffer, every field read returned
   * `undefined`, so the "expected" signature was constant and verification
   * was effectively broken/bypassable.
   *
   * Now: HMAC-SHA256 over the raw request bytes with ZAINCASH_SECRET.
   * Confirm with ZainCash docs whether they sign the raw body or a specific
   * field concatenation — if it's the latter, source the field list from
   * their integration docs and parse the buffer to reconstruct it (see
   * qicard.gateway.ts for that pattern), but do NOT silently guess.
   */
  async verifyWebhook(payload: Buffer | unknown, signature: string): Promise<boolean> {
    const secret = this.config.get<string>('ZAINCASH_SECRET');
    if (!secret) return false;

    // payload must be a raw Buffer (registered via express.raw() in main.ts)
    if (!Buffer.isBuffer(payload)) {
      this.logger.error(
        'ZainCash verifyWebhook received a non-Buffer payload — ' +
        'ensure /api/payments/zaincash/webhook is registered with express.raw() before json()',
      );
      return false;
    }

    const expected = crypto
      .createHmac('sha256', secret)
      .update(payload)          // raw bytes — no re-serialisation
      .digest('hex');

    try {
      return crypto.timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(signature, 'hex'));
    } catch {
      return false;
    }
  }

  async refund(_gatewayId: string, _amount: number): Promise<void> {
    // ZainCash has no programmatic refund API — must be done via merchant portal.
    this.logger.warn('ZainCash refund must be processed manually via merchant portal.');
  }

  parseWebhookStatus(payload: Record<string, unknown>): 'completed' | 'failed' | 'cancelled' {
    const s = String(payload['status'] ?? '').toLowerCase();
    if (s === 'paid')                  return 'completed';
    if (s === 'failed' || s === 'error') return 'failed';
    return 'cancelled';
  }
}
