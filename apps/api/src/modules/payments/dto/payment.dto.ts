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
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

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

// F-MED fix: PaymentStatus/PaymentGateway used to be declared locally here
// with lowercase values ('pending', 'stripe', ...) and PaymentGateway was
// missing ALIPAY/WECHATPAY entirely, even though those gateways exist
// (see modules/payments/gateways/alipay.gateway.ts,
// wechatpay.gateway.ts). Now re-exported from the shared mirror in
// common/prisma/enums.ts, which matches the real Prisma enums
// (schema.prisma) exactly — uppercase values, all 7 gateways. Every
// existing `import { PaymentStatus } from './dto/payment.dto'` elsewhere in
// the codebase keeps working unchanged; only the values changed (now
// uppercase) and PaymentGateway gained 2 members.
import { PaymentStatus, PaymentGateway } from '../../../common/prisma/enums';
export { PaymentStatus, PaymentGateway };

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
  @ApiProperty({ description: 'Subscription plan to pay for', enum: PaymentPlan, example: PaymentPlan.PREMIUM })
  @IsEnum(PaymentPlan, {
    message: `plan must be one of: ${Object.values(PaymentPlan).join(', ')}`,
  })
  plan!: PaymentPlan;

  @ApiProperty({ description: 'Currency to pay in', enum: PaymentCurrency, example: PaymentCurrency.USD })
  @IsEnum(PaymentCurrency, {
    message: `currency must be one of: ${Object.values(PaymentCurrency).join(', ')}`,
  })
  currency!: PaymentCurrency;

  /** Optional preferred gateway. Server applies defaults based on currency. */
  @ApiPropertyOptional({
    description: 'Preferred payment gateway. If omitted, the server picks a sensible default based on currency.',
    enum: PaymentGateway,
  })
  @IsOptional()
  @IsEnum(PaymentGateway)
  gateway?: PaymentGateway;
}

export class RefundPaymentDto {
  @ApiProperty({ description: 'Payment id to refund', format: 'uuid' })
  @IsUUID('4')
  paymentId!: string;

  /**
   * Optional partial refund amount in minor units (cents for USD, dinars for IQD).
   * Omit for a full refund.
   */
  @ApiPropertyOptional({
    description: 'Partial refund amount in minor units (cents for USD, full dinars for IQD). Omit for a full refund.',
    example: 1000,
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 0 })
  @IsPositive()
  @Max(10_000_000)
  amount?: number;

  @ApiPropertyOptional({ description: 'Reason for the refund', example: 'Customer requested cancellation' })
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
  @ApiProperty({ description: 'Subscription plan to pay for', enum: PaymentPlan })
  @IsEnum(PaymentPlan)
  plan!: PaymentPlan;

  /**
   * Iraqi mobile number — must start with +9647 or 07.
   * Example: +9647700000000
   */
  @ApiProperty({ description: 'Iraqi mobile number (must start with +9647 or 07)', example: '+9647700000000' })
  @IsString()
  @Matches(/^(\+9647|07)\d{9}$/, {
    message: 'phone must be a valid Iraqi mobile number (e.g. +9647700000000)',
  })
  phone!: string;
}

/** POST /payments/asiahawala/confirm-otp */
export class AsiaHawalaConfirmOtpDto {
  @ApiProperty({ description: 'Transaction id returned by the initiate step' })
  @IsString()
  transactionId!: string;

  @ApiProperty({ description: 'One-time password sent to the phone number', example: '123456', minLength: 4, maxLength: 8 })
  @IsString()
  @Length(4, 8)
  otp!: string;
}
