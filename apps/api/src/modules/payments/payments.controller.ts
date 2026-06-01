// apps/api/src/modules/payments/payments.controller.ts
import {
  Controller, Get, Post, Patch, Param, Body, UseGuards, Request,
  ParseUUIDPipe, ForbiddenException, NotFoundException,
} from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { EmailVerifiedGuard } from '../../common/guards/email-verified.guard';

// Whitelist of allowed plan names
const ALLOWED_PLANS = ['FREE', 'BASIC', 'PREMIUM', 'ENTERPRISE'] as const;
type AllowedPlan = typeof ALLOWED_PLANS[number];

const ALLOWED_CURRENCIES = ['USD', 'IQD', 'EUR', 'GBP'] as const;

/**
 * All payment endpoints require both authentication AND email verification.
 * Payments are a sensitive action — unverified users cannot initiate or
 * confirm payment records.
 */
@Controller('payments')
@UseGuards(JwtAuthGuard, EmailVerifiedGuard)
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Get()
  getAll(@Request() req: any) {
    return this.paymentsService.getMyPayments(req.user.userId);
  }

  @Post()
  create(
    @Request() req: any,
    @Body() body: { plan: string; amount: number; currency: string },
  ) {
    // FIX: Validate plan and currency against whitelists
    const plan = ALLOWED_PLANS.includes(body.plan as AllowedPlan)
      ? (body.plan as AllowedPlan)
      : null;
    if (!plan) throw new ForbiddenException('Invalid plan');

    const currency = ALLOWED_CURRENCIES.includes(body.currency as any)
      ? body.currency
      : 'USD';

    const amount = Number(body.amount);
    if (!isFinite(amount) || amount <= 0 || amount > 1_000_000) {
      throw new ForbiddenException('Invalid amount');
    }

    return this.paymentsService.createPayment(req.user.userId, plan, amount, currency);
  }

  // FIX: confirmPayment now verifies ownership — previously any authenticated
  // user could confirm any payment by ID (IDOR / broken object-level auth).
  @Patch(':id/confirm')
  async confirm(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: any,
  ) {
    return this.paymentsService.confirmPayment(id, req.user.userId);
  }
}
