// apps/api/src/modules/payments/gateways/fastpay.gateway.ts
//
// FastPay Iraq / Kurdistan — Bearer-token embedded checkout
// Supports IQD and USD

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosError } from 'axios';
import * as crypto from 'crypto';
import { IGateway, GatewayChargeParams, GatewayChargeResult } from './gateway.interface';

const BASE = 'https://api.fastpay.iq/v1';

@Injectable()
export class FastPayGateway implements IGateway {
  readonly name = 'fastpay';
  private readonly logger = new Logger(FastPayGateway.name);

  constructor(private readonly config: ConfigService) {}

  private key(): string {
    const k = this.config.get<string>('FASTPAY_API_KEY');
    if (!k) throw new Error('FastPay not configured (FASTPAY_API_KEY missing)');
    return k;
  }

  async createCharge(params: GatewayChargeParams): Promise<GatewayChargeResult> {
    const apiKey = this.key();
    const ref = `FP-${params.userId.slice(0, 8)}-${Date.now()}`;

    const body = {
      amount: params.amount,
      currency: params.currency.toUpperCase(),
      reference_id: ref,
      description: `CarsAuto — plan ${params.planId}`,
      customer: { user_id: params.userId },
      redirect_url: params.returnUrl,
      cancel_url: params.cancelUrl,
      metadata: params.metadata ?? {},
    };

    this.logger.log(`FastPay charge init: ref=${ref} amount=${params.amount} ${params.currency}`);

    try {
      const res = await axios.post<{ id: string; status: string; checkout_url: string }>(
        `${BASE}/charges`, body,
        { headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' }, timeout: 15_000 },
      );
      return {
        gatewayId: res.data.id,
        checkoutData: { url: res.data.checkout_url, status: res.data.status },
        status: 'pending',
      };
    } catch (err: unknown) {
      const msg = (err as AxiosError<{ message?: string }>).response?.data?.message ?? (err as Error).message;
      this.logger.error(`FastPay charge failed: ${msg}`);
      throw new Error(`FastPay payment initiation failed: ${msg}`);
    }
  }

  /**
   * F4 FIX (a): Accept raw Buffer from the webhook route (registered with
   * express.raw() in main.ts before json() middleware runs).
   *
   * Previously: re-serialised the already-parsed JS object via JSON.stringify(),
   * which is NOT guaranteed to reproduce the original bytes (key order, number
   * formatting, Unicode escapes can differ). This caused signature mismatches on
   * legitimate webhooks and would not have caught forged payloads that exploited
   * the normalisation difference.
   *
   * Previously also: used createHash (plain hash) with concatenation instead of
   * createHmac — concatenation-then-hash is not a standard MAC construction.
   *
   * Now: HMAC-SHA256 over the raw bytes with the API key as the secret.
   * Confirm with FastPay docs whether they use a dedicated webhook signing secret
   * separate from FASTPAY_API_KEY; if so, source it from FASTPAY_WEBHOOK_SECRET
   * instead.
   */
  async verifyWebhook(payload: Buffer | unknown, signature: string): Promise<boolean> {
    const apiKey = this.config.get<string>('FASTPAY_API_KEY');
    if (!apiKey) return false;

    // payload must be a raw Buffer (registered via express.raw() in main.ts)
    if (!Buffer.isBuffer(payload)) {
      this.logger.error(
        'FastPay verifyWebhook received a non-Buffer payload — ' +
        'ensure /api/payments/fastpay/webhook is registered with express.raw() before json()',
      );
      return false;
    }

    const expected = crypto
      .createHmac('sha256', apiKey)
      .update(payload)          // raw bytes — no re-serialisation
      .digest('hex');

    try {
      return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
    } catch {
      return false;
    }
  }

  async refund(gatewayId: string, amount: number): Promise<void> {
    const apiKey = this.key();
    try {
      await axios.post(`${BASE}/charges/${gatewayId}/refund`, { amount },
        { headers: { Authorization: `Bearer ${apiKey}` }, timeout: 15_000 });
    } catch (err: unknown) {
      const msg = (err as AxiosError<{ message?: string }>).response?.data?.message ?? (err as Error).message;
      throw new Error(`FastPay refund failed: ${msg}`);
    }
  }

  parseWebhookStatus(payload: Record<string, unknown>): 'completed' | 'failed' | 'cancelled' {
    const s = String(payload['status'] ?? '').toLowerCase();
    if (s === 'paid' || s === 'succeeded') return 'completed';
    if (s === 'failed' || s === 'error')   return 'failed';
    return 'cancelled';
  }
}
