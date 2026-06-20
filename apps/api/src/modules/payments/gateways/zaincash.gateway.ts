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

  async verifyWebhook(payload: unknown, signature: string): Promise<boolean> {
    const secret = this.config.get<string>('ZAINCASH_SECRET');
    if (!secret) return false;
    const b = payload as Record<string, unknown>;
    const expected = crypto
      .createHmac('sha256', secret)
      .update(`${b['id']}${b['status']}${b['amount']}${b['orderId']}`)
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
