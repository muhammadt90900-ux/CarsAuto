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

  async verifyWebhook(payload: unknown, signature: string): Promise<boolean> {
    const { merchantCode, terminalId } = this.creds();
    const b = payload as Record<string, unknown>;
    const expected = crypto
      .createHmac('sha256', terminalId)
      .update(`${b['transactionId']}|${b['orderId']}|${b['amount']}|${merchantCode}|${terminalId}`)
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
