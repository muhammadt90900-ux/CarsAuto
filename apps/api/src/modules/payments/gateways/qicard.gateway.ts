// apps/api/src/modules/payments/gateways/qicard.gateway.ts
//
// QiCard Iraq — merchant/terminal redirect flow
// Currency: IQD

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosError } from 'axios';
import * as crypto from 'crypto';
import { IGateway, GatewayChargeParams, GatewayChargeResult } from './gateway.interface';

const BASE = 'https://payment.qi.iq/api/v1';

@Injectable()
export class QiCardGateway implements IGateway {
  readonly name = 'qicard';
  private readonly logger = new Logger(QiCardGateway.name);

  constructor(private readonly config: ConfigService) {}

  private creds() {
    const merchantCode = this.config.get<string>('QICARD_MERCHANT_CODE');
    const terminalId   = this.config.get<string>('QICARD_TERMINAL_ID');
    if (!merchantCode || !terminalId) throw new Error('QiCard not configured');
    return { merchantCode, terminalId };
  }

  async createCharge(params: GatewayChargeParams): Promise<GatewayChargeResult> {
    const { merchantCode, terminalId } = this.creds();
    const orderId   = `QI-${params.userId.slice(0, 8)}-${Date.now()}`;
    const amountIQD = Math.round(params.amount);

    this.logger.log(`QiCard charge init: orderId=${orderId} amount=${amountIQD} IQD`);

    try {
      const res = await axios.post<{
        transactionId: string; redirectUrl: string;
        responseCode: string; responseMessage: string;
      }>(
        `${BASE}/payment`,
        { merchantCode, terminalId, orderId, amount: amountIQD, currency: 'IQD',
          description: `CarsAuto — plan ${params.planId}`,
          returnUrl: params.returnUrl, cancelUrl: params.cancelUrl,
          customerUserId: params.userId },
        { headers: { 'Content-Type': 'application/json' }, timeout: 15_000 },
      );

      if (res.data.responseCode !== '00') {
        throw new Error(`QiCard rejected: ${res.data.responseMessage}`);
      }

      return { gatewayId: res.data.transactionId, redirectUrl: res.data.redirectUrl, status: 'pending' };
    } catch (err: unknown) {
      if (err instanceof Error && err.message.startsWith('QiCard rejected')) throw err;
      const msg = (err as AxiosError<{ responseMessage?: string }>).response?.data?.responseMessage ?? (err as Error).message;
      throw new Error(`QiCard payment failed: ${msg}`);
    }
  }

  /**
   * F4 FIX (b + raw-body):
   *
   * Two separate problems fixed here:
   *
   * 1. RAW BYTES: payload now arrives as a raw Buffer (registered via
   *    express.raw() in main.ts). Previously the route received a parsed JS
   *    object because it was not exempted from the global json() middleware,
   *    making HMAC verification unreliable.
   *
   * 2. SIGNING SECRET: previously used `terminalId` as the HMAC key.
   *    Terminal IDs appear on receipts and in outbound API requests — they are
   *    merchant *identifiers*, not secrets. Any customer who has transacted with
   *    this merchant account can observe the terminalId and forge webhook
   *    signatures for arbitrary payloads.
   *
   *    FIX: source the key from QICARD_WEBHOOK_SECRET (a dedicated secret that
   *    QiCard should provide in their merchant dashboard — check their
   *    integration docs under "Webhook Configuration" or "Security Keys").
   *
   *    IF QiCard does not issue a dedicated webhook signing secret:
   *    - Do NOT fall back to terminalId.
   *    - Instead, treat incoming webhooks as UNTRUSTED notifications only, and
   *      make a server-to-server status-poll call to `GET /api/v1/payment/{id}`
   *      to confirm payment status before crediting a subscription.
   *    - Set QICARD_WEBHOOK_SECRET to empty string and handle that case below.
   */
  async verifyWebhook(payload: Buffer | unknown, signature: string): Promise<boolean> {
    // payload must be a raw Buffer (registered via express.raw() in main.ts)
    if (!Buffer.isBuffer(payload)) {
      this.logger.error(
        'QiCard verifyWebhook received a non-Buffer payload — ' +
        'ensure /api/payments/qicard/webhook is registered with express.raw() before json()',
      );
      return false;
    }

    const webhookSecret = this.config.get<string>('QICARD_WEBHOOK_SECRET');

    // If QiCard has not issued a dedicated signing secret, fall back to
    // server-to-server status poll (see comment above) rather than accepting
    // a signature we cannot verify with a genuine secret.
    if (!webhookSecret) {
      this.logger.warn(
        'QICARD_WEBHOOK_SECRET is not set — cannot verify webhook signature. ' +
        'Rejecting webhook. Configure a dedicated signing secret from the QiCard ' +
        'merchant portal, or implement a server-to-server status poll to confirm payment.',
      );
      return false;
    }

    // Parse the raw buffer so we can reconstruct the canonical signing string
    // from the individual fields (as QiCard's scheme signs specific fields, not
    // the whole body).
    let b: Record<string, unknown>;
    try {
      b = JSON.parse(payload.toString('utf8')) as Record<string, unknown>;
    } catch {
      this.logger.error('QiCard verifyWebhook: payload is not valid JSON');
      return false;
    }

    const expected = crypto
      .createHmac('sha256', webhookSecret)             // dedicated secret, not terminalId
      .update(`${b['transactionId']}|${b['orderId']}|${b['amount']}|${b['merchantCode']}|${b['terminalId']}`)
      .digest('hex');

    try {
      return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
    } catch {
      return false;
    }
  }

  async refund(gatewayId: string, amount: number): Promise<void> {
    const { merchantCode, terminalId } = this.creds();
    try {
      await axios.post(`${BASE}/refund`,
        { merchantCode, terminalId, transactionId: gatewayId, amount },
        { timeout: 15_000 });
    } catch (err: unknown) {
      const msg = (err as AxiosError<{ responseMessage?: string }>).response?.data?.responseMessage ?? (err as Error).message;
      throw new Error(`QiCard refund failed: ${msg}`);
    }
  }

  parseWebhookStatus(payload: Record<string, unknown>): 'completed' | 'failed' | 'cancelled' {
    const code = String(payload['responseCode'] ?? '');
    if (code === '00')             return 'completed';
    if (code === '05' || code === '51') return 'failed';
    return 'cancelled';
  }
}
