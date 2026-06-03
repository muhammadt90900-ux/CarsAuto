// apps/api/src/modules/payments/payments.controller.ts
//
// REST endpoints for the payment system.
// Webhook endpoint bypasses JWT auth (Stripe-Signature verified instead).
// All other endpoints require JWT + email verification.

import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  UseGuards,
  Request,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
  RawBodyRequest,
  Headers,
  Query,
} from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { EmailVerifiedGuard } from '../../common/guards/email-verified.guard';
import { StripeWebhookGuard } from './guards/stripe-webhook.guard';
import { CreatePaymentIntentDto, RefundPaymentDto } from './dto/payment.dto';
import Stripe from 'stripe';

/**
 * POST /payments/webhook
 *   → Stripe event receiver. No JWT; verified via Stripe-Signature.
 *     Requires express.raw() middleware on this route — see main.ts.
 *
 * GET  /payments
 *   → Current user's payment history.
 *
 * GET  /payments/:id
 *   → Single payment with transaction log (must belong to user).
 *
 * POST /payments/intent
 *   → Create Stripe PaymentIntent and return client_secret.
 *     Amount is resolved server-side from plan + currency — never trusted from client.
 *
 * GET  /payments/subscription
 *   → Current user's subscription status.
 *
 * DELETE /payments/subscription
 *   → Cancel subscription (at period end by default).
 *
 * POST /payments/:id/refund
 *   → Request a refund on a completed payment.
 */
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  // ── Stripe webhook — NO JWT ────────────────────────────────────────────────
  @Post('webhook')
  @UseGuards(StripeWebhookGuard)
  @HttpCode(HttpStatus.OK)
  async handleWebhook(@Request() req: RawBodyRequest<any>) {
    // stripeEvent is attached by StripeWebhookGuard after signature verification
    const event: Stripe.Event = req.stripeEvent;
    return this.paymentsService.handleWebhook(event);
  }

  // ── Authenticated routes ───────────────────────────────────────────────────
  @Get()
  @UseGuards(JwtAuthGuard, EmailVerifiedGuard)
  getAll(@Request() req: any) {
    return this.paymentsService.getMyPayments(req.user.userId);
  }

  @Get('subscription')
  @UseGuards(JwtAuthGuard, EmailVerifiedGuard)
  getSubscription(@Request() req: any) {
    return this.paymentsService.getMySubscription(req.user.userId);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, EmailVerifiedGuard)
  getOne(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: any,
  ) {
    return this.paymentsService.getPaymentById(id, req.user.userId);
  }

  /**
   * Create a Stripe PaymentIntent.
   * Returns { clientSecret, paymentId } for use with Stripe.js on the frontend.
   * Amount is NEVER accepted from the client — resolved server-side from the plan.
   */
  @Post('intent')
  @UseGuards(JwtAuthGuard, EmailVerifiedGuard)
  createIntent(
    @Request() req: any,
    @Body() dto: CreatePaymentIntentDto,
  ) {
    return this.paymentsService.createPaymentIntent(req.user.userId, dto);
  }

  /**
   * Request a refund on a completed payment.
   * Partial refunds supported via optional `amount` (minor units).
   */
  @Post(':id/refund')
  @UseGuards(JwtAuthGuard, EmailVerifiedGuard)
  @HttpCode(HttpStatus.ACCEPTED)
  requestRefund(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: any,
    @Body() body: Omit<RefundPaymentDto, 'paymentId'>,
  ) {
    return this.paymentsService.initiateRefund(req.user.userId, {
      paymentId: id,
      amount: body.amount,
      reason: body.reason,
    });
  }

  /**
   * Cancel subscription.
   * ?immediately=true cancels now; default cancels at period end.
   */
  @Delete('subscription')
  @UseGuards(JwtAuthGuard, EmailVerifiedGuard)
  @HttpCode(HttpStatus.OK)
  cancelSubscription(
    @Request() req: any,
    @Query('immediately') immediately?: string,
  ) {
    const atPeriodEnd = immediately !== 'true';
    return this.paymentsService.cancelSubscription(req.user.userId, atPeriodEnd);
  }
}
