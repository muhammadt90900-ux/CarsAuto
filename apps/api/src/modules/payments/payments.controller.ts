// apps/api/src/modules/payments/payments.controller.ts
//
// REST endpoints for the payment system.
// Webhook endpoints bypass JWT auth (signature verified instead).
// All other endpoints require JWT + email verification.
//
// POST /payments/webhook                    → Stripe webhook
// POST /payments/zaincash/webhook           → ZainCash webhook
// POST /payments/fastpay/webhook            → FastPay webhook
// POST /payments/qicard/webhook             → QiCard webhook
// POST /payments/asiahawala/webhook         → AsiaHawala webhook
// POST /payments/asiahawala/initiate        → Start OTP flow (Step 1)
// POST /payments/asiahawala/confirm-otp     → Confirm OTP (Step 2)
// GET  /payments                            → Current user's payment history
// GET  /payments/subscription               → Current subscription status
// GET  /payments/:id                        → Single payment + transaction log
// POST /payments/intent                     → Create payment intent (all gateways)
// POST /payments/:id/refund                 → Request refund
// DELETE /payments/subscription             → Cancel subscription

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
  BadRequestException,
} from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { EmailVerifiedGuard } from '../../common/guards/email-verified.guard';
import { StripeWebhookGuard } from './guards/stripe-webhook.guard';
import {
  CreatePaymentIntentDto,
  RefundPaymentDto,
  AsiaHawalaInitiateDto,
  AsiaHawalaConfirmOtpDto,
} from './dto/payment.dto';
import Stripe from 'stripe';
import { ApiTags, ApiBearerAuth, ApiExcludeEndpoint } from '@nestjs/swagger';

@ApiTags('Payments')
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  // ── Stripe webhook — NO JWT ────────────────────────────────────────────────
  @ApiExcludeEndpoint()
  @Post('webhook')
  @UseGuards(StripeWebhookGuard)
  @HttpCode(HttpStatus.OK)
  async handleStripeWebhook(@Request() req: RawBodyRequest<any>) {
    // stripeEvent attached by StripeWebhookGuard after signature verification
    const event: Stripe.Event = req.stripeEvent;
    return this.paymentsService.handleWebhook(event);
  }

  // ── ZainCash webhook — NO JWT ──────────────────────────────────────────────
  @ApiExcludeEndpoint()
  @Post('zaincash/webhook')
  @HttpCode(HttpStatus.OK)
  async handleZainCashWebhook(
    @Body() payload: Buffer,
    @Headers('x-zaincash-signature') signature: string,
  ) {
    if (!signature) throw new BadRequestException('Missing X-ZainCash-Signature header');
    return this.paymentsService.handleRegionalWebhook('zaincash', payload, signature);
  }

  // ── FastPay webhook — NO JWT ───────────────────────────────────────────────
  @ApiExcludeEndpoint()
  @Post('fastpay/webhook')
  @HttpCode(HttpStatus.OK)
  async handleFastPayWebhook(
    @Body() payload: Buffer,
    @Headers('x-fastpay-signature') signature: string,
  ) {
    if (!signature) throw new BadRequestException('Missing X-FastPay-Signature header');
    return this.paymentsService.handleRegionalWebhook('fastpay', payload, signature);
  }

  // ── QiCard webhook — NO JWT ────────────────────────────────────────────────
  @ApiExcludeEndpoint()
  @Post('qicard/webhook')
  @HttpCode(HttpStatus.OK)
  async handleQiCardWebhook(
    @Body() payload: Buffer,
    @Headers('x-qicard-signature') signature: string,
  ) {
    if (!signature) throw new BadRequestException('Missing X-QiCard-Signature header');
    return this.paymentsService.handleRegionalWebhook('qicard', payload, signature);
  }

  // ── AsiaHawala webhook — NO JWT ────────────────────────────────────────────
  @ApiExcludeEndpoint()
  @Post('asiahawala/webhook')
  @HttpCode(HttpStatus.OK)
  async handleAsiaHawalaWebhook(
    @Body() payload: Buffer,
    @Headers('x-asiahawala-signature') signature: string,
  ) {
    if (!signature) throw new BadRequestException('Missing X-AsiaHawala-Signature header');
    return this.paymentsService.handleRegionalWebhook('asiahawala', payload, signature);
  }

  // ── AsiaHawala Step 1: Initiate OTP ───────────────────────────────────────
  @Post('asiahawala/initiate')
  @ApiBearerAuth('bearer')
  @UseGuards(JwtAuthGuard, EmailVerifiedGuard)
  initiateAsiaHawala(@Request() req: any, @Body() dto: AsiaHawalaInitiateDto) {
    return this.paymentsService.initiateAsiaHawala(req.user.userId, dto);
  }

  // ── AsiaHawala Step 2: Confirm OTP ────────────────────────────────────────
  @Post('asiahawala/confirm-otp')
  @ApiBearerAuth('bearer')
  @UseGuards(JwtAuthGuard, EmailVerifiedGuard)
  confirmAsiaHawalaOtp(@Request() req: any, @Body() dto: AsiaHawalaConfirmOtpDto) {
    return this.paymentsService.confirmAsiaHawalaOtp(req.user.userId, dto);
  }

  // ── Authenticated routes ───────────────────────────────────────────────────
  @Get()
  @ApiBearerAuth('bearer')
  @UseGuards(JwtAuthGuard, EmailVerifiedGuard)
  getAll(@Request() req: any) {
    return this.paymentsService.getMyPayments(req.user.userId);
  }

  @Get('subscription')
  @ApiBearerAuth('bearer')
  @UseGuards(JwtAuthGuard, EmailVerifiedGuard)
  getSubscription(@Request() req: any) {
    return this.paymentsService.getMySubscription(req.user.userId);
  }

  @Get(':id')
  @ApiBearerAuth('bearer')
  @UseGuards(JwtAuthGuard, EmailVerifiedGuard)
  getOne(@Param('id', ParseUUIDPipe) id: string, @Request() req: any) {
    return this.paymentsService.getPaymentById(id, req.user.userId);
  }

  /**
   * Create a payment intent/charge.
   * Returns:
   *   Stripe   → { clientSecret, paymentId }
   *   Redirect → { paymentId, gateway, redirectUrl }
   *   OTP      → { paymentId, gateway, checkoutData: { requiresOtp: true } }
   * Amount is NEVER accepted from the client — resolved server-side from plan.
   */
  @Post('intent')
  @ApiBearerAuth('bearer')
  @UseGuards(JwtAuthGuard, EmailVerifiedGuard)
  createIntent(@Request() req: any, @Body() dto: CreatePaymentIntentDto) {
    return this.paymentsService.createPaymentIntent(req.user.userId, dto);
  }

  /**
   * Request a refund on a completed payment.
   * Partial refunds supported via optional `amount` (minor units for Stripe, dinars for IQD gateways).
   */
  @Post(':id/refund')
  @ApiBearerAuth('bearer')
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
  @ApiBearerAuth('bearer')
  @UseGuards(JwtAuthGuard, EmailVerifiedGuard)
  @HttpCode(HttpStatus.OK)
  cancelSubscription(@Request() req: any, @Query('immediately') immediately?: string) {
    return this.paymentsService.cancelSubscription(req.user.userId, immediately !== 'true');
  }
}
