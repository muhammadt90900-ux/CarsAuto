// apps/api/src/modules/payments/dto/payment.dto.ts
import {
  IsEnum,
  IsNumber,
  IsPositive,
  Max,
  IsString,
  IsOptional,
  IsUUID,
  Matches,
  Length,
} from 'class-validator';

// ─── Enums ────────────────────────────────────────────────────────────────────

export enum PaymentPlan {
  BASIC      = 'BASIC',
  PREMIUM    = 'PREMIUM',
  ENTERPRISE = 'ENTERPRISE',
  BUYER      = 'BUYER',
}

export enum PaymentCurrency {
  USD = 'USD',
  IQD = 'IQD',
  EUR = 'EUR',
  GBP = 'GBP',
  AED = 'AED',
  CNY = 'CNY',
}

export enum PaymentStatus {
  PENDING   = 'pending',
  COMPLETED = 'completed',
  FAILED    = 'failed',
  REFUNDED  = 'refunded',
  CANCELLED = 'cancelled',
}

export enum PaymentGateway {
  STRIPE     = 'stripe',
  ZAINCASH   = 'zaincash',
  FASTPAY    = 'fastpay',
  QICARD     = 'qicard',
  ASIAHAWALA = 'asiahawala',
}

// ─── Plan pricing — Stripe minor units (cents, fils, etc.) ───────────────────
// Server-side enforced: client sends plan name only, never an amount.
export const PLAN_PRICES: Record<PaymentPlan, Partial<Record<PaymentCurrency, number>>> = {
  [PaymentPlan.BASIC]: {
    [PaymentCurrency.USD]: 1999,    // $19.99
    [PaymentCurrency.EUR]: 1799,
    [PaymentCurrency.GBP]: 1599,
    [PaymentCurrency.AED]: 7499,
    [PaymentCurrency.CNY]: 14500,
  },
  [PaymentPlan.PREMIUM]: {
    [PaymentCurrency.USD]: 4999,    // $49.99
    [PaymentCurrency.EUR]: 4499,
    [PaymentCurrency.GBP]: 3999,
    [PaymentCurrency.AED]: 18499,
    [PaymentCurrency.CNY]: 36500,
  },
  [PaymentPlan.ENTERPRISE]: {
    [PaymentCurrency.USD]: 9999,    // $99.99
    [PaymentCurrency.EUR]: 8999,
    [PaymentCurrency.GBP]: 7999,
    [PaymentCurrency.AED]: 36999,
    [PaymentCurrency.CNY]: 72900,
  },
  [PaymentPlan.BUYER]: {
    [PaymentCurrency.USD]: 299,     // $2.99
    [PaymentCurrency.EUR]: 279,
    [PaymentCurrency.GBP]: 249,
    [PaymentCurrency.AED]: 1099,
    [PaymentCurrency.CNY]: 2199,
  },
};

// ─── IQD pricing — full Iraqi Dinars (NOT fils) ───────────────────────────────
// Iraqi gateways (ZainCash, FastPay, QiCard, AsiaHawala) use full dinars.
// Rate ~1 USD = 1,300 IQD
export const PLAN_PRICES_IQD: Record<PaymentPlan, number> = {
  [PaymentPlan.BASIC]:      26_000,
  [PaymentPlan.PREMIUM]:    65_000,
  [PaymentPlan.ENTERPRISE]: 130_000,
  [PaymentPlan.BUYER]:      3_900,
};

// IQD is zero-decimal for our regional gateways (amounts in full dinars).
export const ZERO_DECIMAL_CURRENCIES = new Set(['IQD']);

// ─── DTOs ─────────────────────────────────────────────────────────────────────

export class CreatePaymentIntentDto {
  @IsEnum(PaymentPlan, {
    message: `plan must be one of: ${Object.values(PaymentPlan).join(', ')}`,
  })
  plan!: PaymentPlan;

  @IsEnum(PaymentCurrency, {
    message: `currency must be one of: ${Object.values(PaymentCurrency).join(', ')}`,
  })
  currency!: PaymentCurrency;

  /** Optional preferred gateway. Server applies defaults based on currency. */
  @IsOptional()
  @IsEnum(PaymentGateway)
  gateway?: PaymentGateway;
}

export class RefundPaymentDto {
  @IsUUID('4')
  paymentId!: string;

  /**
   * Optional partial refund amount in minor units (cents for USD, dinars for IQD).
   * Omit for a full refund.
   */
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 0 })
  @IsPositive()
  @Max(10_000_000)
  amount?: number;

  @IsOptional()
  @IsString()
  reason?: string;
}

export class WebhookDto {
  rawBody!: Buffer;
  signature!: string;
}

/** POST /payments/asiahawala/initiate */
export class AsiaHawalaInitiateDto {
  @IsEnum(PaymentPlan)
  plan!: PaymentPlan;

  /**
   * Iraqi mobile number — must start with +9647 or 07.
   * Example: +9647700000000
   */
  @IsString()
  @Matches(/^(\+9647|07)\d{9}$/, {
    message: 'phone must be a valid Iraqi mobile number (e.g. +9647700000000)',
  })
  phone!: string;
}

/** POST /payments/asiahawala/confirm-otp */
export class AsiaHawalaConfirmOtpDto {
  @IsString()
  transactionId!: string;

  @IsString()
  @Length(4, 8)
  otp!: string;
}
