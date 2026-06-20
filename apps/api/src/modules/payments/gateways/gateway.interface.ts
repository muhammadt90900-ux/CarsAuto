// apps/api/src/modules/payments/gateways/gateway.interface.ts

export interface GatewayChargeParams {
  amount: number;       // IQD gateways: full dinars. Stripe: minor units.
  currency: string;
  userId: string;
  planId: string;
  metadata?: Record<string, string>;
  returnUrl: string;
  cancelUrl: string;
}

export interface GatewayChargeResult {
  gatewayId: string;
  redirectUrl?: string;             // ZainCash, QiCard redirect flow
  checkoutData?: Record<string, unknown>; // FastPay embedded / AsiaHawala OTP flag
  status: 'pending' | 'completed' | 'failed';
}

export interface IGateway {
  readonly name: string;
  createCharge(params: GatewayChargeParams): Promise<GatewayChargeResult>;
  verifyWebhook(payload: unknown, signature: string): Promise<boolean>;
  refund(gatewayId: string, amount: number): Promise<void>;
}
