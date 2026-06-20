// apps/api/src/modules/payments/payments.service.ts
//
// Production-grade payment service implementing:
//   ✓ Payment validation (server-side plan pricing — no client amount trust)
//   ✓ Stripe PaymentIntent creation
//   ✓ Iraqi regional gateways: ZainCash, FastPay, QiCard, AsiaHawala (OTP)
//   ✓ Gateway routing by currency / preferred gateway
//   ✓ Webhook handling with idempotency (Stripe + regional)
//   ✓ Failed payment recovery with exponential back-off retry scheduling
//   ✓ Subscription create / update / cancel
//   ✓ Transaction logging (every state transition recorded)
//   ✓ Refund workflow (full & partial, all gateways)

import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
  ConflictException,
} from '@nestjs/common';
import Stripe from 'stripe';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../common/prisma/prisma.service';
import {
  CreatePaymentIntentDto,
  PaymentPlan,
  PaymentCurrency,
  PaymentStatus,
  PaymentGateway,
  PLAN_PRICES,
  PLAN_PRICES_IQD,
  ZERO_DECIMAL_CURRENCIES,
  RefundPaymentDto,
  AsiaHawalaInitiateDto,
  AsiaHawalaConfirmOtpDto,
} from './dto/payment.dto';
import { ZainCashGateway } from './gateways/zaincash.gateway';
import { FastPayGateway } from './gateways/fastpay.gateway';
import { QiCardGateway } from './gateways/qicard.gateway';
import { AsiaHawalaGateway } from './gateways/asiahawala.gateway';
import { IGateway, GatewayChargeParams } from './gateways/gateway.interface';

// ─── Retry policy ─────────────────────────────────────────────────────────────
const MAX_RETRIES = 3;
const RETRY_DELAYS_MINUTES = [15, 60, 240];

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);
  private readonly stripe: Stripe;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly zainCash: ZainCashGateway,
    private readonly fastPay: FastPayGateway,
    private readonly qiCard: QiCardGateway,
    private readonly asiaHawala: AsiaHawalaGateway,
  ) {
    const secretKey = this.config.get<string>('STRIPE_SECRET_KEY');
    if (!secretKey) {
      this.logger.warn('STRIPE_SECRET_KEY not set — Stripe payment features disabled');
    }
    this.stripe = new Stripe(secretKey ?? 'sk_test_placeholder', {
      apiVersion: '2023-10-16',
      timeout: 10_000,
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // GATEWAY ROUTING
  // ─────────────────────────────────────────────────────────────────────────

  private resolveGateway(currency: string, preferred?: PaymentGateway): IGateway | null {
    if (currency.toUpperCase() !== 'IQD') return null; // Stripe

    if (preferred === PaymentGateway.FASTPAY)    return this.fastPay;
    if (preferred === PaymentGateway.QICARD)     return this.qiCard;
    if (preferred === PaymentGateway.ASIAHAWALA) return this.asiaHawala;
    if (preferred === PaymentGateway.ZAINCASH)   return this.zainCash;

    const fastPayEnabled = this.config.get<string>('FASTPAY_ENABLED') === 'true';
    return fastPayEnabled ? this.fastPay : this.zainCash;
  }

  private regionalGatewayByName(name: string): IGateway | null {
    const map: Record<string, IGateway> = {
      zaincash:   this.zainCash,
      fastpay:    this.fastPay,
      qicard:     this.qiCard,
      asiahawala: this.asiaHawala,
    };
    return map[name] ?? null;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // QUERY
  // ─────────────────────────────────────────────────────────────────────────

  async getMyPayments(userId: string) {
    return this.prisma.payment.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, plan: true, amount: true, currency: true,
        status: true,
        // NOTE: 'gateway' is selected as a raw field after Prisma regeneration.
        // Until `npx prisma generate` runs with the new schema, we cast via
        // the underlying DB column using a type assertion below.
        gatewayId: true,
        refundedAt: true, refundAmount: true,
        createdAt: true, updatedAt: true,
      },
    });
  }

  async getPaymentById(id: string, userId: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { id },
      include: { transactionLogs: { orderBy: { createdAt: 'asc' } } },
    });
    if (!payment) throw new NotFoundException('Payment not found');
    if (payment.userId !== userId) throw new ForbiddenException('Access denied');
    return payment;
  }

  async getMySubscription(userId: string) {
    return this.prisma.subscription.findUnique({ where: { userId } });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // CREATE PAYMENT INTENT
  // ─────────────────────────────────────────────────────────────────────────

  async createPaymentIntent(userId: string, dto: CreatePaymentIntentDto) {
    const gateway = this.resolveGateway(dto.currency, dto.gateway);

    if (gateway !== null) {
      return this.createRegionalCharge(userId, dto, gateway);
    }

    this.assertStripeConfigured();
    return this.createStripePaymentIntent(userId, dto);
  }

  // ─── Regional gateway charge ───────────────────────────────────────────────

  private async createRegionalCharge(
    userId: string,
    dto: CreatePaymentIntentDto,
    gateway: IGateway,
  ) {
    const amount = this.resolveAmountIQD(dto.plan);

    await this.cancelStalePending(userId, dto.plan, gateway.name);

    const frontendUrl = this.config.get<string>('FRONTEND_URL') ?? 'http://localhost:3000';
    const chargeParams: GatewayChargeParams = {
      amount,
      currency: dto.currency,
      userId,
      planId: dto.plan,
      returnUrl: `${frontendUrl}/payment/success`,
      cancelUrl:  `${frontendUrl}/payment/cancel`,
    };

    const result = await gateway.createCharge(chargeParams);

    // FIX: cast metadata to Prisma-compatible type
    const payment = await (this.prisma.payment as any).create({
      data: {
        userId,
        plan: dto.plan,
        amount,
        currency: dto.currency,
        status: PaymentStatus.PENDING,
        gateway: gateway.name,
        gatewayId: result.gatewayId,
        gatewayStatus: result.status,
        metadata: (result.checkoutData ?? {}) as object,
      },
    });

    await this.logTransaction(payment.id, {
      event: 'charge_initiated',
      status: PaymentStatus.PENDING,
      amount,
      currency: dto.currency,
      gatewayId: result.gatewayId,
      gatewayData: { gateway: gateway.name, redirectUrl: result.redirectUrl },
    });

    this.logger.log(`${gateway.name} charge created: ${result.gatewayId} user=${userId} plan=${dto.plan}`);

    return {
      paymentId:    payment.id,
      gateway:      gateway.name,
      redirectUrl:  result.redirectUrl,
      checkoutData: result.checkoutData,
      status:       result.status,
    };
  }

  // ─── Stripe PaymentIntent ──────────────────────────────────────────────────

  private async createStripePaymentIntent(userId: string, dto: CreatePaymentIntentDto) {
    const canonicalAmount = this.resolveAmount(dto.plan, dto.currency);

    // Idempotency: reuse existing pending intent if still usable
    const existingPending = await (this.prisma.payment as any).findFirst({
      where: { userId, plan: dto.plan, status: PaymentStatus.PENDING, gateway: 'stripe' },
    });
    if (existingPending?.gatewayId) {
      try {
        const intent = await this.stripe.paymentIntents.retrieve(existingPending.gatewayId);
        if (intent.status === 'requires_payment_method' || intent.status === 'requires_confirmation') {
          return { clientSecret: intent.client_secret, paymentId: existingPending.id };
        }
      } catch { /* stale — create a new one */ }
      await this.updatePaymentStatus(existingPending.id, PaymentStatus.CANCELLED, {
        event: 'cancelled', errorMessage: 'Superseded by new payment intent',
      });
    }

    const intent = await this.stripe.paymentIntents.create({
      amount: canonicalAmount,
      currency: dto.currency.toLowerCase(),
      metadata: { userId, plan: dto.plan },
      automatic_payment_methods: { enabled: true },
    });

    const payment = await (this.prisma.payment as any).create({
      data: {
        userId,
        plan: dto.plan,
        amount: this.minorToDecimal(canonicalAmount, dto.currency),
        currency: dto.currency,
        status: PaymentStatus.PENDING,
        gateway: 'stripe',
        gatewayId: intent.id,
        gatewayStatus: intent.status,
        metadata: { intentId: intent.id } as object,
      },
    });

    await this.logTransaction(payment.id, {
      event: 'intent_created',
      status: PaymentStatus.PENDING,
      amount: payment.amount as any,
      currency: dto.currency,
      gatewayId: intent.id,
      gatewayData: { stripeStatus: intent.status },
    });

    this.logger.log(`Stripe PaymentIntent created: ${intent.id} user=${userId} plan=${dto.plan}`);

    return { clientSecret: intent.client_secret, paymentId: payment.id };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // ASIAHAWALA TWO-STEP OTP
  // ─────────────────────────────────────────────────────────────────────────

  async initiateAsiaHawala(userId: string, dto: AsiaHawalaInitiateDto) {
    const amount = this.resolveAmountIQD(dto.plan);
    await this.cancelStalePending(userId, dto.plan, 'asiahawala');

    const result = await this.asiaHawala.initiateCharge({
      phone: dto.phone, amount, userId, planId: dto.plan,
    });

    const payment = await (this.prisma.payment as any).create({
      data: {
        userId,
        plan: dto.plan,
        amount,
        currency: PaymentCurrency.IQD,
        status: PaymentStatus.PENDING,
        gateway: PaymentGateway.ASIAHAWALA,
        gatewayId: result.transactionId,
        gatewayStatus: 'awaiting_otp',
        metadata: { phone: dto.phone, expiresAt: result.expiresAt.toISOString() } as object,
      },
    });

    await this.logTransaction(payment.id, {
      event: 'otp_sent', status: PaymentStatus.PENDING,
      amount, currency: PaymentCurrency.IQD,
      gatewayId: result.transactionId, gatewayData: { phone: dto.phone },
    });

    return { paymentId: payment.id, transactionId: result.transactionId, expiresAt: result.expiresAt };
  }

  async confirmAsiaHawalaOtp(userId: string, dto: AsiaHawalaConfirmOtpDto) {
    const payment = await (this.prisma.payment as any).findFirst({
      where: {
        userId,
        gateway: PaymentGateway.ASIAHAWALA,
        gatewayId: dto.transactionId,
        status: PaymentStatus.PENDING,
      },
    });
    if (!payment) throw new NotFoundException('Pending AsiaHawala transaction not found');

    const result = await this.asiaHawala.confirmOTP(dto.transactionId, dto.otp);

    if (result.status === 'completed') {
      await this.updatePaymentStatus(payment.id, PaymentStatus.COMPLETED, {
        event: 'otp_confirmed', status: PaymentStatus.COMPLETED,
        gatewayId: dto.transactionId, gatewayData: { message: result.message },
      });
      await this.upsertSubscription(userId, payment.plan as PaymentPlan);
      this.logger.log(`AsiaHawala OTP confirmed: payment=${payment.id}`);
      return { status: 'completed', paymentId: payment.id };
    }

    await this.updatePaymentStatus(payment.id, PaymentStatus.FAILED, {
      event: 'otp_failed', status: PaymentStatus.FAILED,
      errorMessage: result.message ?? 'OTP verification failed',
    });
    throw new BadRequestException(result.message ?? 'OTP verification failed');
  }

  // ─────────────────────────────────────────────────────────────────────────
  // WEBHOOK HANDLER — Stripe
  // ─────────────────────────────────────────────────────────────────────────

  async handleWebhook(event: Stripe.Event) {
    const existing = await this.prisma.webhookEvent.findUnique({
      where: { gatewayId: event.id },
    });
    if (existing) {
      this.logger.debug(`Webhook ${event.id} already processed — skipping`);
      return { received: true, skipped: true };
    }

    let processingError: string | undefined;

    try {
      switch (event.type) {
        case 'payment_intent.succeeded':
          await this.onPaymentIntentSucceeded(event.data.object as Stripe.PaymentIntent); break;
        case 'payment_intent.payment_failed':
          await this.onPaymentIntentFailed(event.data.object as Stripe.PaymentIntent); break;
        case 'payment_intent.canceled':
          await this.onPaymentIntentCancelled(event.data.object as Stripe.PaymentIntent); break;
        case 'charge.refunded':
          await this.onChargeRefunded(event.data.object as Stripe.Charge); break;
        case 'customer.subscription.updated':
        case 'customer.subscription.deleted':
          await this.onSubscriptionChanged(event.data.object as Stripe.Subscription, event.type); break;
        case 'invoice.payment_failed':
          await this.onInvoicePaymentFailed(event.data.object as Stripe.Invoice); break;
        default:
          this.logger.debug(`Unhandled webhook type: ${event.type}`);
      }
    } catch (err: any) {
      processingError = err.message;
      this.logger.error(`Webhook handler error for ${event.id}: ${err.message}`, err.stack);
    }

    await this.prisma.webhookEvent.create({
      data: { gatewayId: event.id, type: event.type, payload: event as any, error: processingError },
    });

    return { received: true };
  }

  // ─── WEBHOOK HANDLER — Regional gateways ──────────────────────────────────

  async handleRegionalWebhook(
    gatewayName: string,
    payload: Record<string, unknown>,
    signature: string,
  ) {
    const gateway = this.regionalGatewayByName(gatewayName);
    if (!gateway) throw new BadRequestException(`Unknown gateway: ${gatewayName}`);

    const isValid = await gateway.verifyWebhook(payload, signature);
    if (!isValid) throw new ForbiddenException('Invalid webhook signature');

    const gatewayId = String(
      payload['transactionId'] ?? payload['id'] ?? payload['transaction_id'] ?? '',
    );
    if (!gatewayId) return { received: true };

    const webhookKey = `${gatewayName}:${gatewayId}`;
    const existing = await this.prisma.webhookEvent.findUnique({ where: { gatewayId: webhookKey } });
    if (existing) return { received: true, skipped: true };

    const payment = await (this.prisma.payment as any).findFirst({
      where: { gatewayId, gateway: gatewayName },
    });

    let processingError: string | undefined;

    if (payment) {
      try {
        const status = (gateway as any).parseWebhookStatus(payload) as 'completed' | 'failed' | 'cancelled';
        const dbStatus =
          status === 'completed' ? PaymentStatus.COMPLETED :
          status === 'failed'    ? PaymentStatus.FAILED    : PaymentStatus.CANCELLED;

        await this.updatePaymentStatus(payment.id, dbStatus, {
          event: `${gatewayName}_webhook`, status: dbStatus, gatewayId, gatewayData: payload,
        });

        if (status === 'completed') {
          await this.upsertSubscription(payment.userId, payment.plan as PaymentPlan);
        }
      } catch (err: any) {
        processingError = err.message;
        this.logger.error(`${gatewayName} webhook processing error: ${err.message}`);
      }
    }

    await this.prisma.webhookEvent.create({
      data: {
        gatewayId: webhookKey,
        type: `${gatewayName}.webhook`,
        payload: payload as any,
        error: processingError,
      },
    });

    return { received: true };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // REFUND
  // ─────────────────────────────────────────────────────────────────────────

  async initiateRefund(requestingUserId: string, dto: RefundPaymentDto, isAdmin = false) {
    const payment = await this.prisma.payment.findUnique({ where: { id: dto.paymentId } });
    if (!payment) throw new NotFoundException('Payment not found');
    if (!isAdmin && payment.userId !== requestingUserId) throw new ForbiddenException('Access denied');
    if (payment.status !== PaymentStatus.COMPLETED) {
      throw new BadRequestException(`Cannot refund payment in status: ${payment.status}`);
    }
    if (payment.refundedAt) throw new ConflictException('Payment has already been refunded');
    if (!payment.gatewayId) throw new BadRequestException('Payment has no gateway ID');

    const gatewayName: string = (payment as any).gateway ?? 'stripe';

    await this.logTransaction(payment.id, {
      event: 'refund_initiated',
      status: payment.status,
      amount: dto.amount ?? (payment.amount as any),
      currency: payment.currency,
      gatewayId: payment.gatewayId,
      gatewayData: { reason: dto.reason, gateway: gatewayName },
    });

    // Stripe refund
    if (gatewayName === 'stripe') {
      const refundParams: Stripe.RefundCreateParams = {
        payment_intent: payment.gatewayId,
        reason: 'requested_by_customer',
      };
      if (dto.amount) {
        const maxMinor = this.decimalToMinor(payment.amount as unknown as number, payment.currency as PaymentCurrency);
        if (dto.amount > maxMinor) throw new BadRequestException('Refund amount exceeds original payment');
        refundParams.amount = dto.amount;
      }
      if (dto.reason) refundParams.metadata = { reason: dto.reason };
      const refund = await this.stripe.refunds.create(refundParams);
      this.logger.log(`Stripe refund created: ${refund.id} for payment ${payment.id}`);
      return { refundId: refund.id, status: refund.status };
    }

    // Regional gateway refund
    const gateway = this.regionalGatewayByName(gatewayName);
    if (!gateway) throw new BadRequestException(`No refund handler for gateway: ${gatewayName}`);

    await gateway.refund(payment.gatewayId, dto.amount ?? (payment.amount as unknown as number));

    await this.prisma.payment.update({
      where: { id: payment.id },
      data: { status: PaymentStatus.REFUNDED, refundedAt: new Date() },
    });

    this.logger.log(`${gatewayName} refund issued for payment ${payment.id}`);
    return { status: 'refunded', gateway: gatewayName };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // SUBSCRIPTION MANAGEMENT
  // ─────────────────────────────────────────────────────────────────────────

  async cancelSubscription(userId: string, atPeriodEnd = true) {
    const sub = await this.prisma.subscription.findUnique({ where: { userId } });
    if (!sub) throw new NotFoundException('No active subscription');
    if (sub.status !== 'active') {
      throw new BadRequestException(`Subscription is not active (status: ${sub.status})`);
    }
    if (!sub.gatewaySubscriptionId) {
      throw new BadRequestException('Subscription has no gateway ID');
    }

    await this.stripe.subscriptions.update(sub.gatewaySubscriptionId, {
      cancel_at_period_end: atPeriodEnd,
    });

    await this.prisma.subscription.update({
      where: { userId },
      data: {
        cancelAtPeriodEnd: atPeriodEnd,
        cancelledAt: atPeriodEnd ? null : new Date(),
        status: atPeriodEnd ? 'active' : 'cancelled',
        metadata: { ...(sub.metadata as object ?? {}), cancelledBy: 'user' },
      },
    });

    this.logger.log(`Subscription ${sub.gatewaySubscriptionId} cancel_at_period_end=${atPeriodEnd} for user ${userId}`);
    return { cancelAtPeriodEnd: atPeriodEnd, currentPeriodEnd: sub.currentPeriodEnd };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // FAILED PAYMENT RECOVERY
  // ─────────────────────────────────────────────────────────────────────────

  async retryFailedPayments() {
    const now = new Date();
    const due = await this.prisma.payment.findMany({
      where: {
        status: PaymentStatus.FAILED,
        nextRetryAt: { lte: now },
        retryCount: { lt: MAX_RETRIES },
      },
    });
    this.logger.log(`Retry sweep: ${due.length} payment(s) due`);
    for (const payment of due) {
      await this.retryPayment(payment);
    }
    return { processed: due.length };
  }

  async retryPayment(payment: {
    id: string; gatewayId: string | null; retryCount: number; currency: string; amount: any;
  }) {
    if (!payment.gatewayId) {
      this.logger.warn(`Payment ${payment.id} has no gatewayId — cannot retry`);
      return;
    }
    try {
      const intent = await this.stripe.paymentIntents.confirm(payment.gatewayId);
      this.logger.log(`Retry ${payment.retryCount + 1} for payment ${payment.id}: status=${intent.status}`);
      if (intent.status === 'succeeded') {
        await this.updatePaymentStatus(payment.id, PaymentStatus.COMPLETED, {
          event: 'confirmed', status: PaymentStatus.COMPLETED,
          gatewayId: payment.gatewayId,
          gatewayData: { stripeStatus: intent.status, retryAttempt: payment.retryCount + 1 },
        });
      } else {
        await this.scheduleRetry(payment.id, payment.retryCount);
      }
    } catch (err: any) {
      this.logger.warn(`Retry failed for payment ${payment.id}: ${err.message}`);
      await this.scheduleRetry(payment.id, payment.retryCount, err.message);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // STRIPE WEBHOOK INTERNALS
  // ─────────────────────────────────────────────────────────────────────────

  private async onPaymentIntentSucceeded(intent: Stripe.PaymentIntent) {
    const payment = await this.findPaymentByGatewayId(intent.id);
    if (!payment) return;
    await this.updatePaymentStatus(payment.id, PaymentStatus.COMPLETED, {
      event: 'confirmed', status: PaymentStatus.COMPLETED,
      amount: payment.amount as any, currency: payment.currency,
      gatewayId: intent.id,
      gatewayData: { stripeStatus: intent.status, chargeId: intent.latest_charge },
    });
    await this.upsertSubscription(payment.userId, payment.plan as PaymentPlan);
    this.logger.log(`Payment confirmed via webhook: ${payment.id} (${intent.id})`);
  }

  private async onPaymentIntentFailed(intent: Stripe.PaymentIntent) {
    const payment = await this.findPaymentByGatewayId(intent.id);
    if (!payment) return;
    const failureReason = intent.last_payment_error?.message ?? 'Unknown failure';
    await this.updatePaymentStatus(payment.id, PaymentStatus.FAILED, {
      event: 'failed', status: PaymentStatus.FAILED,
      gatewayId: intent.id,
      gatewayData: { stripeStatus: intent.status, error: failureReason },
      errorMessage: failureReason,
    });
    await this.scheduleRetry(payment.id, payment.retryCount, failureReason);
    this.logger.warn(`Payment failed via webhook: ${payment.id} — ${failureReason}`);
  }

  private async onPaymentIntentCancelled(intent: Stripe.PaymentIntent) {
    const payment = await this.findPaymentByGatewayId(intent.id);
    if (!payment) return;
    await this.updatePaymentStatus(payment.id, PaymentStatus.CANCELLED, {
      event: 'cancelled', status: PaymentStatus.CANCELLED,
      gatewayId: intent.id, gatewayData: { stripeStatus: intent.status },
    });
  }

  private async onChargeRefunded(charge: Stripe.Charge) {
    if (!charge.payment_intent) return;
    const gatewayId = typeof charge.payment_intent === 'string'
      ? charge.payment_intent : charge.payment_intent.id;
    const payment = await this.findPaymentByGatewayId(gatewayId);
    if (!payment) return;
    const refundedAmount = charge.amount_refunded;
    await this.prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: PaymentStatus.REFUNDED,
        refundedAt: new Date(),
        refundAmount: this.minorToDecimal(refundedAmount, payment.currency as PaymentCurrency),
        gatewayStatus: 'refunded',
      },
    });
    await this.logTransaction(payment.id, {
      event: 'refund_confirmed', status: PaymentStatus.REFUNDED,
      amount: this.minorToDecimal(refundedAmount, payment.currency as PaymentCurrency),
      currency: payment.currency, gatewayId,
      gatewayData: { isFullRefund: charge.refunded, chargeId: charge.id },
    });
    if (charge.refunded) {
      await this.prisma.subscription.updateMany({
        where: { userId: payment.userId, status: 'active' },
        data: { status: 'cancelled', cancelledAt: new Date() },
      });
    }
    this.logger.log(`Refund confirmed for payment ${payment.id}`);
  }

  private async onSubscriptionChanged(stripeSub: Stripe.Subscription, _eventType: string) {
    const userId = stripeSub.metadata?.userId;
    if (!userId) {
      this.logger.warn(`Subscription ${stripeSub.id} has no userId in metadata`);
      return;
    }
    const status = this.mapStripeSubscriptionStatus(stripeSub.status);
    await this.prisma.subscription.upsert({
      where: { userId },
      create: {
        userId, plan: (stripeSub.metadata?.plan ?? 'BASIC') as string, status,
        gatewaySubscriptionId: stripeSub.id,
        currentPeriodStart: new Date(stripeSub.current_period_start * 1000),
        currentPeriodEnd:   new Date(stripeSub.current_period_end   * 1000),
        cancelAtPeriodEnd: stripeSub.cancel_at_period_end,
        cancelledAt: stripeSub.canceled_at ? new Date(stripeSub.canceled_at * 1000) : null,
      },
      update: {
        status,
        currentPeriodStart: new Date(stripeSub.current_period_start * 1000),
        currentPeriodEnd:   new Date(stripeSub.current_period_end   * 1000),
        cancelAtPeriodEnd: stripeSub.cancel_at_period_end,
        cancelledAt: stripeSub.canceled_at ? new Date(stripeSub.canceled_at * 1000) : null,
      },
    });
    this.logger.log(`Subscription ${stripeSub.id} updated to status=${status} for user ${userId}`);
  }

  private async onInvoicePaymentFailed(invoice: Stripe.Invoice) {
    const subId = typeof invoice.subscription === 'string'
      ? invoice.subscription : invoice.subscription?.id;
    if (!subId) return;
    await this.prisma.subscription.updateMany({
      where: { gatewaySubscriptionId: subId },
      data: { status: 'past_due' },
    });
    this.logger.warn(`Invoice payment failed for subscription ${subId} — status set to past_due`);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // PRIVATE HELPERS
  // ─────────────────────────────────────────────────────────────────────────

  private async upsertSubscription(userId: string, plan: PaymentPlan) {
    await this.prisma.subscription.upsert({
      where: { userId },
      create: { userId, plan, status: 'active' },
      update: { plan, status: 'active' },
    });
  }

  private async cancelStalePending(userId: string, plan: string, gateway: string) {
    const existing = await (this.prisma.payment as any).findFirst({
      where: { userId, plan, status: PaymentStatus.PENDING, gateway },
    });
    if (!existing) return;
    await this.updatePaymentStatus(existing.id, PaymentStatus.CANCELLED, {
      event: 'cancelled', errorMessage: 'Superseded by new payment attempt',
    });
  }

  private async scheduleRetry(paymentId: string, currentRetryCount: number, failureReason?: string) {
    const newRetryCount = currentRetryCount + 1;
    if (newRetryCount > MAX_RETRIES) {
      this.logger.warn(`Payment ${paymentId} exceeded max retries — marking permanently failed`);
      await this.prisma.payment.update({
        where: { id: paymentId },
        data: { retryCount: newRetryCount, nextRetryAt: null, failureReason: failureReason ?? 'Max retries exceeded' },
      });
      await this.logTransaction(paymentId, {
        event: 'max_retries_exceeded', status: PaymentStatus.FAILED,
        errorMessage: `Max retries (${MAX_RETRIES}) exceeded`,
      });
      return;
    }
    const delayMinutes = RETRY_DELAYS_MINUTES[currentRetryCount] ?? 240;
    const nextRetryAt  = new Date(Date.now() + delayMinutes * 60 * 1000);
    await this.prisma.payment.update({
      where: { id: paymentId },
      data: { retryCount: newRetryCount, nextRetryAt, failureReason },
    });
    await this.logTransaction(paymentId, {
      event: 'retry_scheduled', status: PaymentStatus.FAILED, errorMessage: failureReason,
      gatewayData: { retryCount: newRetryCount, nextRetryAt: nextRetryAt.toISOString(), delayMinutes },
    });
    this.logger.log(`Payment ${paymentId} retry ${newRetryCount}/${MAX_RETRIES} scheduled at ${nextRetryAt.toISOString()}`);
  }

  private async updatePaymentStatus(
    paymentId: string,
    status: PaymentStatus,
    log: {
      event: string; status?: PaymentStatus | string; amount?: number;
      currency?: string; gatewayId?: string; gatewayData?: object; errorMessage?: string;
    },
  ) {
    // BUG #10 FIX: both writes now happen inside a single DB transaction, so a
    // crash/restart between them can never leave a payment status change with
    // no corresponding TransactionLog row.
    await this.prisma.runInTransaction(async (tx) => {
      await tx.payment.update({
        where: { id: paymentId },
        data: {
          status,
          gatewayStatus: (log.gatewayData as Record<string, any>)?.['stripeStatus'] ?? status,
          failureReason: log.errorMessage ?? null,
          ...(status === PaymentStatus.COMPLETED || status === PaymentStatus.REFUNDED
            ? { nextRetryAt: null } : {}),
        },
      });
      await this.logTransaction(paymentId, { ...log, status: log.status ?? status }, tx);
    });
  }

  private async logTransaction(
    paymentId: string,
    data: {
      event: string; status?: PaymentStatus | string; amount?: number;
      currency?: string; gatewayId?: string; gatewayData?: object; errorMessage?: string;
    },
    tx: { transactionLog: { create: (args: { data: Record<string, unknown> }) => Promise<unknown> } } = this.prisma as any,
  ) {
    await tx.transactionLog.create({
      data: {
        paymentId,
        event: data.event,
        status: data.status ?? '',
        amount: data.amount !== undefined ? data.amount : undefined,
        currency: data.currency,
        gatewayId: data.gatewayId,
        gatewayData: data.gatewayData ?? undefined,
        errorMessage: data.errorMessage,
      },
    });
  }

  private async findPaymentByGatewayId(gatewayId: string) {
    return this.prisma.payment.findUnique({ where: { gatewayId } });
  }

  private resolveAmount(plan: PaymentPlan, currency: PaymentCurrency): number {
    const amount = PLAN_PRICES[plan]?.[currency];
    if (!amount) throw new BadRequestException(`No price defined for plan ${plan} in ${currency}`);
    return amount;
  }

  private resolveAmountIQD(plan: PaymentPlan): number {
    const amount = PLAN_PRICES_IQD[plan];
    if (!amount) throw new BadRequestException(`No IQD price defined for plan ${plan}`);
    return amount;
  }

  private minorToDecimal(minorAmount: number, currency: PaymentCurrency | string): number {
    return ZERO_DECIMAL_CURRENCIES.has(currency.toUpperCase()) ? minorAmount : minorAmount / 100;
  }

  private decimalToMinor(decimalAmount: number, currency: PaymentCurrency | string): number {
    return ZERO_DECIMAL_CURRENCIES.has(currency.toUpperCase())
      ? Math.round(decimalAmount) : Math.round(decimalAmount * 100);
  }

  private mapStripeSubscriptionStatus(stripeStatus: Stripe.Subscription.Status): string {
    const map: Record<Stripe.Subscription.Status, string> = {
      active: 'active', canceled: 'cancelled', incomplete: 'inactive',
      incomplete_expired: 'inactive', past_due: 'past_due',
      paused: 'inactive', trialing: 'trialing', unpaid: 'past_due',
    };
    return map[stripeStatus] ?? 'inactive';
  }

  private assertStripeConfigured() {
    if (!this.config.get<string>('STRIPE_SECRET_KEY')) {
      throw new BadRequestException('Stripe payment gateway is not configured');
    }
  }

  getStripe(): Stripe {
    this.assertStripeConfigured();
    return this.stripe;
  }
}
