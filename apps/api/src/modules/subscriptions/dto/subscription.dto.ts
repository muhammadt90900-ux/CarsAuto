// apps/api/src/modules/subscriptions/dto/subscription.dto.ts

import { IsEnum, IsString } from 'class-validator';

// ── Plan enum (new — separate from the old PaymentPlan) ───────────────────────
export enum SubPlan {
  MONTHLY  = 'MONTHLY',
  BIANNUAL = 'BIANNUAL',
  ANNUAL   = 'ANNUAL',
}

// ── Pricing table (server-side only — never trust the client amount) ──────────
// Amounts in Stripe minor units (cents)
export const SUB_PLAN_PRICES: Record<SubPlan, number> = {
  [SubPlan.MONTHLY]:  1000,  // $10.00
  [SubPlan.BIANNUAL]: 5000,  // $50.00
  [SubPlan.ANNUAL]:   8900,  // $89.00
};

// Duration in days per plan
export const SUB_PLAN_DAYS: Record<SubPlan, number> = {
  [SubPlan.MONTHLY]:  30,
  [SubPlan.BIANNUAL]: 180,
  [SubPlan.ANNUAL]:   365,
};

// ── Request DTOs ──────────────────────────────────────────────────────────────

export class CreateSubscriptionIntentDto {
  @IsEnum(SubPlan, { message: 'plan must be MONTHLY, BIANNUAL, or ANNUAL' })
  plan!: SubPlan;
}

export class ConfirmSubscriptionDto {
  @IsString()
  stripePaymentIntentId!: string;

  @IsEnum(SubPlan, { message: 'plan must be MONTHLY, BIANNUAL, or ANNUAL' })
  plan!: SubPlan;
}
