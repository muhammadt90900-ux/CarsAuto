// apps/api/src/modules/payments/dto/payment.dto.ts
import {
  IsEnum,
  IsNumber,
  IsPositive,
  Max,
  IsString,
  IsOptional,
  IsUUID,
  Min,
  IsIn,
} from 'class-validator';
import { Transform } from 'class-transformer';

// ─── Enums ───────────────────────────────────────────────────────────────────

export enum PaymentPlan {
  BASIC      = 'BASIC',
  PREMIUM    = 'PREMIUM',
  ENTERPRISE = 'ENTERPRISE',
}

export enum PaymentCurrency {
  USD = 'USD',
  IQD = 'IQD',
  EUR = 'EUR',
  GBP = 'GBP',
  AED = 'AED',
}

export enum PaymentStatus {
  PENDING   = 'pending',
  COMPLETED = 'completed',
  FAILED    = 'failed',
  REFUNDED  = 'refunded',
  CANCELLED = 'cancelled',
}

// ─── Plan pricing table (server-side enforced) ────────────────────────────────
// Client sends the plan; server looks up the canonical amount.
// This prevents price manipulation from client payload.
export const PLAN_PRICES: Record<PaymentPlan, Record<PaymentCurrency, number>> = {
  [PaymentPlan.BASIC]: {
    [PaymentCurrency.USD]: 1999,  // $19.99 — amounts in minor units (cents)
    [PaymentCurrency.IQD]: 26000_00, // 26,000 IQD in fils
    [PaymentCurrency.EUR]: 1799,
    [PaymentCurrency.GBP]: 1599,
    [PaymentCurrency.AED]: 7499,
  },
  [PaymentPlan.PREMIUM]: {
    [PaymentCurrency.USD]: 4999,
    [PaymentCurrency.IQD]: 65000_00,
    [PaymentCurrency.EUR]: 4499,
    [PaymentCurrency.GBP]: 3999,
    [PaymentCurrency.AED]: 18499,
  },
  [PaymentPlan.ENTERPRISE]: {
    [PaymentCurrency.USD]: 9999,
    [PaymentCurrency.IQD]: 130000_00,
    [PaymentCurrency.EUR]: 8999,
    [PaymentCurrency.GBP]: 7999,
    [PaymentCurrency.AED]: 36999,
  },
};

// Stripe requires amounts in minor units for most currencies.
// IQD is a zero-decimal currency in Stripe — amount is in IQD directly.
export const ZERO_DECIMAL_CURRENCIES = new Set(['IQD']);

// ─── DTOs ─────────────────────────────────────────────────────────────────────

export class CreatePaymentIntentDto {
  @IsEnum(PaymentPlan, { message: 'plan must be BASIC, PREMIUM, or ENTERPRISE' })
  plan: PaymentPlan;

  @IsEnum(PaymentCurrency, { message: `currency must be one of: ${Object.values(PaymentCurrency).join(', ')}` })
  currency: PaymentCurrency;
}

export class RefundPaymentDto {
  @IsUUID('4')
  paymentId: string;

  /**
   * Optional partial refund amount in minor units.
   * Omit for a full refund.
   */
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 0 })
  @IsPositive()
  @Max(10_000_000) // sanity cap
  amount?: number;

  @IsOptional()
  @IsString()
  reason?: string;
}

export class WebhookDto {
  // Raw body needed for Stripe signature verification — handled via RawBody pipe
  rawBody: Buffer;
  signature: string;
}
