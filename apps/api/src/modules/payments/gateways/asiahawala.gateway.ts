// apps/api/src/modules/payments/gateways/asiahawala.gateway.ts
//
// AsiaHawala Iraq — mobile wallet two-step OTP flow
// Step 1 → initiateCharge() → user receives SMS OTP
// Step 2 → confirmOTP()     → payment finalised

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosError } from 'axios';
import * as crypto from 'crypto';
import { IGateway, GatewayChargeParams, GatewayChargeResult } from './gateway.interface';

const BASE = 'https://asiahawala.com/api/payment';

export interface AsiaHawalaInitiateParams {
  phone: string;   // Iraqi format: 07XXXXXXXXX or +9647XXXXXXXXX
  amount: number;  // IQD
  userId: string;
  planId: string;
}

export interface AsiaHawalaInitiateResult {
  transactionId: string;
  expiresAt: Date;
}

interface AhResponse {
  transactionId: string;
  status: string;
  message?: string;
  expiresAt?: string;
}

@Injectable()
export class AsiaHawalaGateway implements IGateway {
  readonly name = 'asiahawala';
  private readonly logger = new Logger(AsiaHawalaGateway.name);

  constructor(private readonly config: ConfigService) {}

  private creds() {
    const apiKey     = this.config.get<string>('ASIA_HAWALA_API_KEY');
    const merchantId = this.config.get<string>('ASIA_HAWALA_MERCHANT_ID');
    if (!apiKey || !merchantId) throw new Error('AsiaHawala not configured');
    return { apiKey, merchantId };
  }

  // IGateway.createCharge — phone must be in metadata.phone
  async createCharge(params: GatewayChargeParams): Promise<GatewayChargeResult> {
    const phone = params.metadata?.['phone'];
    if (!phone) throw new Error('AsiaHawala requires metadata.phone');
    const result = await this.initiateCharge({ phone, amount: params.amount, userId: params.userId, planId: params.planId });
    return {
      gatewayId: result.transactionId,
      checkoutData: { requiresOtp: true, expiresAt: result.expiresAt.toISOString() },
      status: 'pending',
    };
  }

  // Dedicated initiate (called directly from controller for OTP flow)
  async initiateCharge(params: AsiaHawalaInitiateParams): Promise<AsiaHawalaInitiateResult> {
    const { apiKey, merchantId } = this.creds();
    const body = {
      merchantId,
      phone: params.phone,
      amount: Math.round(params.amount),
      currency: 'IQD',
      reference: `AH-${params.userId.slice(0, 8)}-${Date.now()}`,
      description: `CarsAuto — plan ${params.planId}`,
    };
    this.logger.log(`AsiaHawala initiate: phone=${params.phone} amount=${body.amount} IQD`);
    try {
      const res = await axios.post<AhResponse>(`${BASE}/initiate`, body,
        { headers: { 'X-API-Key': apiKey, 'Content-Type': 'application/json' }, timeout: 15_000 });
      return {
        transactionId: res.data.transactionId,
        expiresAt: res.data.expiresAt
          ? new Date(res.data.expiresAt)
          : new Date(Date.now() + 5 * 60 * 1000),
      };
    } catch (err: unknown) {
      const msg = (err as AxiosError<{ message?: string }>).response?.data?.message ?? (err as Error).message;
      throw new Error(`AsiaHawala initiation failed: ${msg}`);
    }
  }

  // Confirm OTP — Step 2
  async confirmOTP(transactionId: string, otp: string): Promise<{ status: 'completed' | 'failed'; message?: string }> {
    const { apiKey, merchantId } = this.creds();
    this.logger.log(`AsiaHawala confirmOTP: transactionId=${transactionId}`);
    try {
      const res = await axios.post<AhResponse>(`${BASE}/confirm`,
        { merchantId, transactionId, otp },
        { headers: { 'X-API-Key': apiKey }, timeout: 15_000 });
      const s = String(res.data.status ?? '').toLowerCase();
      return { status: s === 'success' || s === 'paid' ? 'completed' : 'failed', message: res.data.message };
    } catch (err: unknown) {
      const msg = (err as AxiosError<{ message?: string }>).response?.data?.message ?? (err as Error).message;
      this.logger.error(`AsiaHawala OTP confirm failed: ${msg}`);
      return { status: 'failed', message: msg };
    }
  }

  /**
   * F4 FIX (a): Accept raw Buffer from the webhook route (registered with
   * express.raw() in main.ts before json() middleware runs).
   *
   * Previously: `JSON.stringify(payload)` where payload was already the parsed
   * JS object — re-serialisation is not guaranteed to equal the original bytes,
   * causing spurious HMAC mismatches on legitimate webhooks.
   *
   * Now: HMAC-SHA256 directly over the raw Buffer.
   */
  async verifyWebhook(payload: Buffer | unknown, signature: string): Promise<boolean> {
    const { apiKey } = this.creds();

    // payload must be a raw Buffer (registered via express.raw() in main.ts)
    if (!Buffer.isBuffer(payload)) {
      this.logger.error(
        'AsiaHawala verifyWebhook received a non-Buffer payload — ' +
        'ensure /api/payments/asiahawala/webhook is registered with express.raw() before json()',
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
    const { apiKey, merchantId } = this.creds();
    try {
      await axios.post(`${BASE}/refund`,
        { merchantId, transactionId: gatewayId, amount },
        { headers: { 'X-API-Key': apiKey }, timeout: 15_000 });
    } catch (err: unknown) {
      const msg = (err as AxiosError<{ message?: string }>).response?.data?.message ?? (err as Error).message;
      throw new Error(`AsiaHawala refund failed: ${msg}`);
    }
  }

  parseWebhookStatus(payload: Record<string, unknown>): 'completed' | 'failed' | 'cancelled' {
    const s = String(payload['status'] ?? '').toLowerCase();
    if (s === 'success' || s === 'paid') return 'completed';
    if (s === 'failed' || s === 'error') return 'failed';
    return 'cancelled';
  }
}
