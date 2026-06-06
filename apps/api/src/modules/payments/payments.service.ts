// apps/api/src/modules/payments/payments.service.ts
//
// Production-grade payment service implementing:
//   ✓ Payment validation (server-side plan pricing — no client amount trust)
//   ✓ Stripe PaymentIntent creation
//   ✓ Webhook handling with idempotency
//   ✓ Failed payment recovery with exponential back-off retry scheduling
//   ✓ Subscription create / update / cancel
//   ✓ Transaction logging (every state transition recorded)
//   ✓ Refund workflow (full & partial)

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
  PLAN_PRICES,
  ZERO_DECIMAL_CURRENCIES,
  RefundPaymentDto,
} from './dto/payment.dto';

// ─── Retry policy ─────────────────────────────────────────────────────────────
const MAX_RETRIES = 3;
// Delays in minutes: 15m → 60m → 240m (4h)
const RETRY_DELAYS_MINUTES = [15, 60, 240];

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);
  private readonly stripe: Stripe;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    const secretKey = this.config.get<string>('STRIPE_SECRET_KEY');
    if (!secretKey) {
      this.logger.warn('STRIPE_SECRET_KEY not set — payment features will throw at runtime');
    }
    this.stripe = new Stripe(secretKey ?? 'sk_test_placeholder', {
      apiVersion: '2023-10-16',
      timeout: 10_000,
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // QUERY
  // ─────────────────────────────────────────────────────────────────────────

  async getMyPayments(userId: string) {
    return this.prisma.payment.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        plan: true,
        amount: true,
        currency: true,
        status: true,
        gatewayId: true,
        refundedAt: true,
        refundAmount: true,
        createdAt: true,
        updatedAt: true,
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
  // Server looks up the canonical amount — client cannot supply a custom price.
  // ─────────────────────────────────────────────────────────────────────────

  async createPaymentIntent(userId: string, dto: CreatePaymentIntentDto) {
    this.assertStripeConfigured();

    const canonicalAmount = this.resolveAmount(dto.plan, dto.currency);

    // Create the DB record first (idempotency: one pending per user per plan)
    const existingPending = await this.prisma.payment.findFirst({
      where: { userId, plan: dto.plan, status: PaymentStatus.PENDING },
    });
    if (existingPending) {
      // Re-use the existing payment intent if it's still usable
      if (existingPending.gatewayId) {
        const intent = await this.stripe.paymentIntents.retrieve(existingPending.gatewayId);
        if (intent.status === 'requires_payment_method' || intent.status === 'requires_confirmation') {
          return { clientSecret: intent.client_secret, paymentId: existingPending.id };
        }
      }
      // Otherwise cancel the stale pending record
      await this.updatePaymentStatus(existingPending.id, PaymentStatus.CANCELLED, {
        event: 'cancelled',
        errorMessage: 'Superseded by new payment intent',
      });
    }

    // Create Stripe PaymentIntent
    const intent = await this.stripe.paymentIntents.create({
      amount: canonicalAmount,
      currency: dto.currency.toLowerCase(),
      metadata: { userId, plan: dto.plan },
      automatic_payment_methods: { enabled: true },
    });

    // Persist payment record
    const payment = await this.prisma.payment.create({
      data: {
        userId,
        plan: dto.plan,
        amount: this.minorToDecimal(canonicalAmount, dto.currency),
        currency: dto.currency,
        status: PaymentStatus.PENDING,
        gatewayId: intent.id,
        gatewayStatus: intent.status,
        metadata: { intentId: intent.id },
      },
    });

    // Log creation
    await this.logTransaction(payment.id, {
      event: 'intent_created',
      status: PaymentStatus.PENDING,
      amount: payment.amount as any,
      currency: dto.currency,
      gatewayId: intent.id,
      gatewayData: { stripeStatus: intent.status },
    });

    this.logger.log(`PaymentIntent created: ${intent.id} for user ${userId} plan ${dto.plan}`);

    return { clientSecret: intent.client_secret, paymentId: payment.id };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // WEBHOOK HANDLER
  // Called by controller after Stripe-Signature has been verified by the guard.
  // Idempotent: duplicate webhook events are silently skipped.
  // ─────────────────────────────────────────────────────────────────────────

  async handleWebhook(event: Stripe.Event) {
    // ── Idempotency check ──────────────────────────────────────────────────
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
          await this.onPaymentIntentSucceeded(event.data.object as Stripe.PaymentIntent);
          break;

        case 'payment_intent.payment_failed':
          await this.onPaymentIntentFailed(event.data.object as Stripe.PaymentIntent);
          break;

        case 'payment_intent.canceled':
          await this.onPaymentIntentCancelled(event.data.object as Stripe.PaymentIntent);
          break;

        case 'charge.refunded':
          await this.onChargeRefunded(event.data.object as Stripe.Charge);
          break;

        case 'customer.subscription.updated':
        case 'customer.subscription.deleted':
          await this.onSubscriptionChanged(event.data.object as Stripe.Subscription, event.type);
          break;

        case 'invoice.payment_failed':
          await this.onInvoicePaymentFailed(event.data.object as Stripe.Invoice);
          break;

        default:
          this.logger.debug(`Unhandled webhook type: ${event.type}`);
      }
    } catch (err: any) {
      processingError = err.message;
      this.logger.error(`Webhook handler error for ${event.id}: ${err.message}`, err.stack);
      // Still record the event so we don't re-process but can diagnose
    }

    // ── Record processed event ─────────────────────────────────────────────
    await this.prisma.webhookEvent.create({
      data: {
        gatewayId: event.id,
        type: event.type,
        payload: event as any,
        error: processingError,
      },
    });

    return { received: true };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // REFUND WORKFLOW
  // ─────────────────────────────────────────────────────────────────────────

  async initiateRefund(requestingUserId: string, dto: RefundPaymentDto, isAdmin = false) {
    const payment = await this.prisma.payment.findUnique({
      where: { id: dto.paymentId },
    });
    if (!payment) throw new NotFoundException('Payment not found');
    if (!isAdmin && payment.userId !== requestingUserId) {
      throw new ForbiddenException('Access denied');
    }
    if (payment.status !== PaymentStatus.COMPLETED) {
      throw new BadRequestException(`Cannot refund payment in status: ${payment.status}`);
    }
    if (payment.refundedAt) {
      throw new ConflictException('Payment has already been refunded');
    }
    if (!payment.gatewayId) {
      throw new BadRequestException('Payment has no gateway ID — cannot process refund');
    }

    const canonicalAmount = payment.amount as unknown as number;
    const refundParams: Stripe.RefundCreateParams = {
      payment_intent: payment.gatewayId,
      reason: 'requested_by_customer',
    };

    // Partial refund: convert decimal amount to minor units
    if (dto.amount) {
      const maxMinor = this.decimalToMinor(canonicalAmount, payment.currency as PaymentCurrency);
      if (dto.amount > maxMinor) {
        throw new BadRequestException('Refund amount exceeds original payment amount');
      }
      refundParams.amount = dto.amount;
    }

    if (dto.reason) {
      refundParams.metadata = { reason: dto.reason };
    }

    this.logger.log(`Initiating refund for payment ${payment.id} (gateway: ${payment.gatewayId})`);

    await this.logTransaction(payment.id, {
      event: 'refund_initiated',
      status: payment.status,
      amount: dto.amount
        ? this.minorToDecimal(dto.amount, payment.currency as PaymentCurrency)
        : (payment.amount as any),
      currency: payment.currency,
      gatewayId: payment.gatewayId,
      gatewayData: { reason: dto.reason },
    });

    // Create refund in Stripe — webhook (charge.refunded) finalises the DB update
    const refund = await this.stripe.refunds.create(refundParams);

    this.logger.log(`Stripe refund created: ${refund.id} for payment ${payment.id}`);

    return { refundId: refund.id, status: refund.status };
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

    const stripeSub = await this.stripe.subscriptions.update(sub.gatewaySubscriptionId, {
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
  // FAILED PAYMENT RECOVERY — schedule retries with exponential back-off
  // Called by a scheduled task (@Cron) or triggered by webhook
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

  async retryPayment(payment: { id: string; gatewayId: string | null; retryCount: number; currency: string; amount: any }) {
    if (!payment.gatewayId) {
      this.logger.warn(`Payment ${payment.id} has no gatewayId — cannot retry`);
      return;
    }

    try {
      // Confirm the existing PaymentIntent (requires a saved payment method on the customer)
      const intent = await this.stripe.paymentIntents.confirm(payment.gatewayId);

      this.logger.log(`Retry ${payment.retryCount + 1} for payment ${payment.id}: Stripe status=${intent.status}`);

      if (intent.status === 'succeeded') {
        await this.updatePaymentStatus(payment.id, PaymentStatus.COMPLETED, {
          event: 'confirmed',
          status: PaymentStatus.COMPLETED,
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
  // PRIVATE HELPERS
  // ─────────────────────────────────────────────────────────────────────────

  private async onPaymentIntentSucceeded(intent: Stripe.PaymentIntent) {
    const payment = await this.findPaymentByGatewayId(intent.id);
    if (!payment) return;

    await this.updatePaymentStatus(payment.id, PaymentStatus.COMPLETED, {
      event: 'confirmed',
      status: PaymentStatus.COMPLETED,
      amount: payment.amount as any,
      currency: payment.currency,
      gatewayId: intent.id,
      gatewayData: { stripeStatus: intent.status, chargeId: intent.latest_charge },
    });

    // Upsert subscription record
    await this.upsertSubscription(payment.userId, payment.plan as PaymentPlan);

    this.logger.log(`Payment confirmed via webhook: ${payment.id} (${intent.id})`);
  }

  private async onPaymentIntentFailed(intent: Stripe.PaymentIntent) {
    const payment = await this.findPaymentByGatewayId(intent.id);
    if (!payment) return;

    const failureReason = intent.last_payment_error?.message ?? 'Unknown failure';

    await this.updatePaymentStatus(payment.id, PaymentStatus.FAILED, {
      event: 'failed',
      status: PaymentStatus.FAILED,
      gatewayId: intent.id,
      gatewayData: { stripeStatus: intent.status, error: failureReason },
      errorMessage: failureReason,
    });

    // Schedule first retry
    await this.scheduleRetry(payment.id, 0, failureReason);

    this.logger.warn(`Payment failed via webhook: ${payment.id} — ${failureReason}`);
  }

  private async onPaymentIntentCancelled(intent: Stripe.PaymentIntent) {
    const payment = await this.findPaymentByGatewayId(intent.id);
    if (!payment) return;

    await this.updatePaymentStatus(payment.id, PaymentStatus.CANCELLED, {
      event: 'cancelled',
      status: PaymentStatus.CANCELLED,
      gatewayId: intent.id,
      gatewayData: { stripeStatus: intent.status },
    });
  }

  private async onChargeRefunded(charge: Stripe.Charge) {
    if (!charge.payment_intent) return;
    const gatewayId = typeof charge.payment_intent === 'string'
      ? charge.payment_intent
      : charge.payment_intent.id;

    const payment = await this.findPaymentByGatewayId(gatewayId);
    if (!payment) return;

    const refundedAmount = charge.amount_refunded;
    const isFullRefund = charge.refunded;

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
      event: 'refund_confirmed',
      status: PaymentStatus.REFUNDED,
      amount: this.minorToDecimal(refundedAmount, payment.currency as PaymentCurrency),
      currency: payment.currency,
      gatewayId: gatewayId,
      gatewayData: { isFullRefund, chargeId: charge.id, refundedAmount },
    });

    // Downgrade subscription on full refund
    if (isFullRefund) {
      await this.prisma.subscription.updateMany({
        where: { userId: payment.userId, status: 'active' },
        data: { status: 'cancelled', cancelledAt: new Date() },
      });
    }

    this.logger.log(`Refund confirmed for payment ${payment.id}: ${refundedAmount} minor units`);
  }

  private async onSubscriptionChanged(stripeSub: Stripe.Subscription, eventType: string) {
    const userId = stripeSub.metadata?.userId;
    if (!userId) {
      this.logger.warn(`Subscription ${stripeSub.id} has no userId in metadata`);
      return;
    }

    const status = this.mapStripeSubscriptionStatus(stripeSub.status);

    await this.prisma.subscription.upsert({
      where: { userId },
      create: {
        userId,
        plan: (stripeSub.metadata?.plan ?? 'BASIC') as string,
        status,
        gatewaySubscriptionId: stripeSub.id,
        currentPeriodStart: new Date(stripeSub.current_period_start * 1000),
        currentPeriodEnd: new Date(stripeSub.current_period_end * 1000),
        cancelAtPeriodEnd: stripeSub.cancel_at_period_end,
        cancelledAt: stripeSub.canceled_at ? new Date(stripeSub.canceled_at * 1000) : null,
      },
      update: {
        status,
        currentPeriodStart: new Date(stripeSub.current_period_start * 1000),
        currentPeriodEnd: new Date(stripeSub.current_period_end * 1000),
        cancelAtPeriodEnd: stripeSub.cancel_at_period_end,
        cancelledAt: stripeSub.canceled_at ? new Date(stripeSub.canceled_at * 1000) : null,
      },
    });

    this.logger.log(`Subscription ${stripeSub.id} updated to status=${status} for user ${userId}`);
  }

  private async onInvoicePaymentFailed(invoice: Stripe.Invoice) {
    const subId = typeof invoice.subscription === 'string'
      ? invoice.subscription
      : invoice.subscription?.id;
    if (!subId) return;

    await this.prisma.subscription.updateMany({
      where: { gatewaySubscriptionId: subId },
      data: { status: 'past_due' },
    });

    this.logger.warn(`Invoice payment failed for subscription ${subId} — status set to past_due`);
  }

  private async upsertSubscription(userId: string, plan: PaymentPlan) {
    await this.prisma.subscription.upsert({
      where: { userId },
      create: { userId, plan, status: 'active' },
      update: { plan, status: 'active' },
    });
  }

  private async scheduleRetry(paymentId: string, currentRetryCount: number, failureReason?: string) {
    const newRetryCount = currentRetryCount + 1;

    if (newRetryCount > MAX_RETRIES) {
      this.logger.warn(`Payment ${paymentId} exceeded max retries (${MAX_RETRIES}) — marking permanently failed`);
      await this.prisma.payment.update({
        where: { id: paymentId },
        data: { retryCount: newRetryCount, nextRetryAt: null, failureReason: failureReason ?? 'Max retries exceeded' },
      });
      await this.logTransaction(paymentId, {
        event: 'max_retries_exceeded',
        status: PaymentStatus.FAILED,
        errorMessage: `Max retries (${MAX_RETRIES}) exceeded`,
      });
      return;
    }

    const delayMinutes = RETRY_DELAYS_MINUTES[currentRetryCount] ?? 240;
    const nextRetryAt = new Date(Date.now() + delayMinutes * 60 * 1000);

    await this.prisma.payment.update({
      where: { id: paymentId },
      data: { retryCount: newRetryCount, nextRetryAt, failureReason },
    });

    await this.logTransaction(paymentId, {
      event: 'retry_scheduled',
      status: PaymentStatus.FAILED,
      errorMessage: failureReason,
      gatewayData: { retryCount: newRetryCount, nextRetryAt: nextRetryAt.toISOString(), delayMinutes },
    });

    this.logger.log(`Payment ${paymentId} retry ${newRetryCount}/${MAX_RETRIES} scheduled at ${nextRetryAt.toISOString()}`);
  }

  private async updatePaymentStatus(
    paymentId: string,
    status: PaymentStatus,
    log: {
      event: string;
      status?: PaymentStatus;
      amount?: number;
      currency?: string;
      gatewayId?: string;
      gatewayData?: object;
      errorMessage?: string;
    },
  ) {
    await this.prisma.payment.update({
      where: { id: paymentId },
      data: {
        status,
        gatewayStatus: (log.gatewayData as Record<string, any>)?.['stripeStatus'] ?? status,
        failureReason: log.errorMessage ?? null,
        // Clear retry schedule on terminal states
        ...(status === PaymentStatus.COMPLETED || status === PaymentStatus.REFUNDED
          ? { nextRetryAt: null }
          : {}),
      },
    });

    await this.logTransaction(paymentId, { ...log, status: log.status ?? status });
  }

  private async logTransaction(
    paymentId: string,
    data: {
      event: string;
      status: PaymentStatus | string;
      amount?: number;
      currency?: string;
      gatewayId?: string;
      gatewayData?: object;
      errorMessage?: string;
    },
  ) {
    await this.prisma.transactionLog.create({
      data: {
        paymentId,
        event: data.event,
        status: data.status,
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

  /** Returns server-side canonical amount in Stripe minor units */
  private resolveAmount(plan: PaymentPlan, currency: PaymentCurrency): number {
    const amount = PLAN_PRICES[plan]?.[currency];
    if (!amount) {
      throw new BadRequestException(`No price defined for plan ${plan} in currency ${currency}`);
    }
    return amount;
  }

  /** Convert minor units → decimal for DB storage */
  private minorToDecimal(minorAmount: number, currency: PaymentCurrency | string): number {
    if (ZERO_DECIMAL_CURRENCIES.has(currency.toUpperCase())) {
      return minorAmount; // IQD: stored as-is
    }
    return minorAmount / 100; // cents → dollars
  }

  /** Convert DB decimal → minor units for Stripe */
  private decimalToMinor(decimalAmount: number, currency: PaymentCurrency | string): number {
    if (ZERO_DECIMAL_CURRENCIES.has(currency.toUpperCase())) {
      return Math.round(decimalAmount);
    }
    return Math.round(decimalAmount * 100);
  }

  private mapStripeSubscriptionStatus(stripeStatus: Stripe.Subscription.Status): string {
    const map: Record<Stripe.Subscription.Status, string> = {
      active: 'active',
      canceled: 'cancelled',
      incomplete: 'inactive',
      incomplete_expired: 'inactive',
      past_due: 'past_due',
      paused: 'inactive',
      trialing: 'trialing',
      unpaid: 'past_due',
    };
    return map[stripeStatus] ?? 'inactive';
  }

  private assertStripeConfigured() {
    if (!this.config.get<string>('STRIPE_SECRET_KEY')) {
      throw new BadRequestException('Payment gateway is not configured');
    }
  }
}
