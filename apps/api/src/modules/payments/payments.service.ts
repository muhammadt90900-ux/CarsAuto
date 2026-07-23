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
  ServiceUnavailableException,
  Logger,
  ConflictException,
} from '@nestjs/common';
import Stripe from 'stripe';
import { ConfigService } from '@nestjs/config';
import { UserSubscriptionPlan, UserSubscriptionStatus } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import {
  CreatePaymentIntentDto,
  PaymentPlan,
  PaymentCurrency,
  PaymentStatus,
  PaymentGateway,
  PLAN_PRICES,
  PLAN_PRICES_IQD,
  PLAN_DURATION_DAYS,
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
import { OptimisticLockError } from './errors/optimistic-lock.error';
import { ExchangeRateService } from './exchange-rate/exchange-rate.service';

// ─── Retry policy ─────────────────────────────────────────────────────────────
const MAX_RETRIES = 3;
const RETRY_DELAYS_MINUTES = [15, 60, 240];

// F1.4: currency the business settles payouts into. Assumed USD (matches
// Stripe's default payout currency for this account's region and is the
// natural reporting currency given the multi-currency expansion) — confirm
// with finance/ops before relying on this for actual settlement reconciliation,
// and change this constant (or make it per-gateway) if that assumption is wrong.
const SETTLEMENT_CURRENCY = 'USD';

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
    private readonly exchangeRate: ExchangeRateService,
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

  /**
   * F-MED fix: Payment.gateway is now a Prisma enum (uppercase labels:
   * 'STRIPE', 'WECHATPAY', ...), but the internal routing keys used
   * throughout this service (gateway.name, the literal strings passed from
   * each webhook route in payments.controller.ts, regionalGatewayByName())
   * are lowercase by convention ('stripe', 'wechatpay', ...) and that
   * naming is unrelated to this fix's scope, so it's left as-is. This is
   * the single conversion point between the two: call this wherever a
   * routing-key string is about to be written into, or filtered against,
   * the Payment.gateway column.
   */
  private toPaymentGatewayEnum(name: string): PaymentGateway {
    const key = name.toUpperCase() as keyof typeof PaymentGateway;
    const value = PaymentGateway[key];
    if (!value) throw new BadRequestException(`Unknown payment gateway: ${name}`);
    return value;
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
        gateway: true,
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
  // ADMIN FIX: the admin/transactions frontend page called GET
  // /admin/transactions and GET /admin/transactions/:id, but no controller in
  // the API mounted anything at that path — PaymentsController only exposes
  // /payments/*, all scoped to the requesting user. Every load of the admin
  // transactions page 404'd. These two methods back a new AdminPaymentsController.
  // ─────────────────────────────────────────────────────────────────────────

  async adminListTransactions(params: {
    page?: number;
    limit?: number;
    status?: string;
    gateway?: string;
    search?: string;
  }) {
    const page  = params.page  && params.page  > 0 ? params.page  : 1;
    const limit = params.limit && params.limit > 0 ? params.limit : 20;

    const where: Record<string, unknown> = {};
    if (params.status)  where.status  = params.status;
    if (params.gateway)  where.gateway = params.gateway;
    if (params.search) {
      where.OR = [
        { gatewayId: { contains: params.search, mode: 'insensitive' } },
        { user: { is: { email: { contains: params.search, mode: 'insensitive' } } } },
        { user: { is: { name:  { contains: params.search, mode: 'insensitive' } } } },
      ];
    }

    const [data, total, revenueAgg] = await Promise.all([
      this.prisma.payment.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: { user: { select: { id: true, name: true, email: true } } },
      }),
      this.prisma.payment.count({ where }),
      // Revenue total intentionally ignores the current filters/pagination —
      // it's "total completed revenue platform-wide", a KPI header, not a
      // sum of the current page.
      this.prisma.payment.aggregate({
        where: { status: PaymentStatus.COMPLETED },
        _sum: { amountUsd: true, amount: true },
      }),
    ]);

    const totalRevenue = revenueAgg._sum.amountUsd ?? revenueAgg._sum.amount ?? 0;
    return { data, total, totalRevenue, page, limit };
  }

  async adminGetTransaction(id: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { id },
      include: {
        transactionLogs: { orderBy: { createdAt: 'asc' } },
        user: { select: { id: true, name: true, email: true } },
      },
    });
    if (!payment) throw new NotFoundException('Payment not found');
    return payment;
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
    const fx = await this.buildFxSnapshot(amount, dto.currency);

    // FIX: cast metadata to Prisma-compatible type
    const payment = await (this.prisma.payment as any).create({
      data: {
        userId,
        plan: dto.plan,
        amount,
        currency: dto.currency,
        status: PaymentStatus.PENDING,
        gateway: this.toPaymentGatewayEnum(gateway.name),
        gatewayId: result.gatewayId,
        gatewayStatus: result.status,
        metadata: (result.checkoutData ?? {}) as object,
        ...fx,
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
      where: { userId, plan: dto.plan, status: PaymentStatus.PENDING, gateway: PaymentGateway.STRIPE },
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
        gateway: PaymentGateway.STRIPE,
        gatewayId: intent.id,
        gatewayStatus: intent.status,
        metadata: { intentId: intent.id } as object,
        ...(await this.buildFxSnapshot(this.minorToDecimal(canonicalAmount, dto.currency), dto.currency)),
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

    // FIX (Bug #2 — "OTP doesn't work"): this call used to be unguarded, so
    // any failure here (most commonly ASIA_HAWALA_API_KEY / MERCHANT_ID not
    // being set in the environment — see asiahawala.gateway.ts's creds())
    // propagated as a plain Error. NestJS's default filter turns an
    // un-caught plain Error into a generic 500 "Internal server error" —
    // the actually useful message ("AsiaHawala not configured") only ever
    // reached the server logs, never the person tapping "Send OTP". Now it's
    // surfaced as a proper 503 with a clear, actionable message instead.
    let result: Awaited<ReturnType<typeof this.asiaHawala.initiateCharge>>;
    try {
      result = await this.asiaHawala.initiateCharge({
        phone: dto.phone, amount, userId, planId: dto.plan,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      this.logger.error(`AsiaHawala initiate failed for user=${userId}: ${msg}`);
      throw new ServiceUnavailableException(
        'AsiaHawala payment is temporarily unavailable. Please try another payment method or contact support.',
      );
    }

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
        ...(await this.buildFxSnapshot(amount, PaymentCurrency.IQD)),
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
    // AUDIT NOTE (F1.3 point 3): the previous version of this method did a
    // `findUnique` check here, then only wrote the WebhookEvent row at the
    // very end, after processing completed. That is a TOCTOU race: two
    // near-simultaneous deliveries of the same event (Stripe does send
    // overlapping retries) could both pass the findUnique check before
    // either had inserted its row, and both would then proceed to mutate
    // the same Payment/Subscription row concurrently — exactly the race
    // this prompt is about. `claimWebhookEvent` below closes that race by
    // making the INSERT itself the guard (relying on gatewayId's unique
    // constraint), not a check that precedes it.
    const webhookEventId = await this.claimWebhookEvent(event.id, event.type, event as any);
    if (webhookEventId === null) {
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
      if (err instanceof OptimisticLockError) {
        // Do NOT swallow this into processingError-and-200. Record what we
        // know (so the WebhookEvent row reflects the failed attempt and a
        // future retry of this same event.id can reclaim it — see
        // claimWebhookEvent), then rethrow so the controller returns a
        // non-2xx response and Stripe's own webhook retry mechanism
        // redelivers this event, instead of us guessing whether it's safe
        // to retry ourselves.
        await this.prisma.webhookEvent
          .update({ where: { id: webhookEventId }, data: { error: err.message } })
          .catch(() => { /* best-effort — the conflict itself is the priority signal */ });
        this.logger.error(
          `Optimistic lock conflict processing webhook ${event.id} (${event.type}): ${err.message}`,
        );
        throw err;
      }
      processingError = err.message;
      this.logger.error(`Webhook handler error for ${event.id}: ${err.message}`, err.stack);
    }

    await this.prisma.webhookEvent.update({
      where: { id: webhookEventId },
      data: { error: processingError ?? null },
    });

    return { received: true };
  }

  // ── Idempotency guard for Stripe webhooks (see AUDIT NOTE above) ──────────
  // Atomically "claims" a gatewayId by inserting the WebhookEvent row before
  // any processing happens, using the unique constraint on gatewayId as the
  // race-safe guard. If a row already exists:
  //   - error IS NULL  → a prior delivery fully processed this event already
  //                       → return null (caller skips).
  //   - error IS NOT NULL → a prior delivery's processing failed (including
  //                       optimistic-lock conflicts) → the stale row is
  //                       reclaimed (deleted + reinserted) so this delivery
  //                       gets a genuine retry, matching Stripe's own retry
  //                       semantics.
  private async claimWebhookEvent(
    gatewayId: string,
    type: string,
    payload: unknown,
  ): Promise<string | null> {
    try {
      const created = await this.prisma.webhookEvent.create({
        data: { gatewayId, type, payload: payload as any },
      });
      return created.id;
    } catch (err: any) {
      if (err.code !== 'P2002') throw err;

      const existing = await this.prisma.webhookEvent.findUnique({ where: { gatewayId } });
      if (!existing) {
        // Raced with a concurrent claim that has since been reclaimed/
        // deleted; treat as already-in-flight and let that delivery own it.
        return null;
      }
      if (existing.error === null) {
        return null; // genuinely already processed successfully
      }

      // Prior attempt failed — reclaim so this delivery can retry cleanly.
      await this.prisma.webhookEvent.delete({ where: { id: existing.id } }).catch(() => {});
      const reclaimed = await this.prisma.webhookEvent.create({
        data: { gatewayId, type, payload: payload as any },
      });
      return reclaimed.id;
    }
  }

  // ─── WEBHOOK HANDLER — Regional gateways ──────────────────────────────────

  async handleRegionalWebhook(
    gatewayName: string,
    rawBody: Buffer,
    signature: string,
  ) {
    const gateway = this.regionalGatewayByName(gatewayName);
    if (!gateway) throw new BadRequestException(`Unknown gateway: ${gatewayName}`);

    // F4 fix: verifyWebhook must receive the RAW Buffer (unmodified bytes) so
    // gateways that HMAC the raw body (fastpay/asiahawala/qicard) keep working.
    // Do NOT parse-then-re-serialise before this call — JSON.stringify() is not
    // guaranteed to reproduce the original bytes (key order, number formatting,
    // unicode escapes can differ), which breaks signature verification.
    const isValid = await gateway.verifyWebhook(rawBody, signature);
    if (!isValid) throw new ForbiddenException('Invalid webhook signature');

    // Parse the Buffer to JSON exactly once, after signature verification,
    // for field extraction / status parsing / storage below.
    let payload: Record<string, unknown>;
    try {
      payload = JSON.parse(rawBody.toString('utf8')) as Record<string, unknown>;
    } catch {
      throw new BadRequestException(`${gatewayName} webhook: payload is not valid JSON`);
    }

    const gatewayId = String(
      payload['transactionId'] ?? payload['id'] ?? payload['transaction_id'] ?? '',
    );
    if (!gatewayId) return { received: true };

    const webhookKey = `${gatewayName}:${gatewayId}`;
    const webhookEventId = await this.claimWebhookEvent(webhookKey, `${gatewayName}.webhook`, payload);
    if (webhookEventId === null) return { received: true, skipped: true };

    const payment = await (this.prisma.payment as any).findFirst({
      where: { gatewayId, gateway: this.toPaymentGatewayEnum(gatewayName) },
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
        if (err instanceof OptimisticLockError) {
          await this.prisma.webhookEvent
            .update({ where: { id: webhookEventId }, data: { error: err.message } })
            .catch(() => {});
          this.logger.error(
            `Optimistic lock conflict processing ${gatewayName} webhook ${webhookKey}: ${err.message}`,
          );
          throw err;
        }
        processingError = err.message;
        this.logger.error(`${gatewayName} webhook processing error: ${err.message}`);
      }
    }

    await this.prisma.webhookEvent.update({
      where: { id: webhookEventId },
      data: { error: processingError ?? null },
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

    // F-MED fix: payment.gateway is now the PaymentGateway enum (uppercase,
    // e.g. 'WECHATPAY') — lowercase it once here since every check below
    // (the 'stripe' comparison, regionalGatewayByName()) uses the lowercase
    // routing-key vocabulary. No more `as any` cast needed either — gateway
    // is now a real, properly-typed field.
    const gatewayName: string = (payment.gateway ?? PaymentGateway.STRIPE).toLowerCase();

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

    await this.updatePaymentStatus(payment.id, PaymentStatus.REFUNDED, {
      event: `${gatewayName}_refund_completed`, status: PaymentStatus.REFUNDED,
      gatewayId: payment.gatewayId,
    }, { refundedAt: new Date() });

    this.logger.log(`${gatewayName} refund issued for payment ${payment.id}`);
    return { status: 'refunded', gateway: gatewayName };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // SUBSCRIPTION MANAGEMENT
  // ─────────────────────────────────────────────────────────────────────────

  async cancelSubscription(userId: string, atPeriodEnd = true) {
    const sub = await this.prisma.subscription.findUnique({ where: { userId } });
    if (!sub) throw new NotFoundException('No active subscription');
    if (sub.status !== UserSubscriptionStatus.ACTIVE) {
      throw new BadRequestException(`Subscription is not active (status: ${sub.status})`);
    }
    if (!sub.gatewaySubscriptionId) {
      throw new BadRequestException('Subscription has no gateway ID');
    }

    await this.stripe.subscriptions.update(sub.gatewaySubscriptionId, {
      cancel_at_period_end: atPeriodEnd,
    });

    // F1.3: version-guarded — sub was read before the Stripe API round-trip
    // above, so a webhook (customer.subscription.updated) could have landed
    // and changed this row while we were waiting on Stripe. Guard on the
    // version we actually read rather than blindly overwriting.
    const result = await this.prisma.subscription.updateMany({
      where: { id: sub.id, version: sub.version },
      data: {
        cancelAtPeriodEnd: atPeriodEnd,
        cancelledAt: atPeriodEnd ? null : new Date(),
        status: atPeriodEnd ? UserSubscriptionStatus.ACTIVE : UserSubscriptionStatus.CANCELLED,
        metadata: { ...(sub.metadata as object ?? {}), cancelledBy: 'user' },
        version: { increment: 1 },
      },
    });
    if (result.count === 0) {
      this.logger.error(
        `Optimistic lock conflict cancelling subscription: userId=${userId} ` +
        `subscriptionId=${sub.id} expectedVersion=${sub.version}`,
      );
      throw new OptimisticLockError(sub.id, `cancel(atPeriodEnd=${atPeriodEnd})`);
    }

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

    await this.updatePaymentStatus(payment.id, PaymentStatus.REFUNDED, {
      event: 'refund_confirmed', status: PaymentStatus.REFUNDED,
      amount: this.minorToDecimal(refundedAmount, payment.currency as PaymentCurrency),
      currency: payment.currency, gatewayId,
      gatewayData: { isFullRefund: charge.refunded, chargeId: charge.id },
    }, {
      refundAmount: this.minorToDecimal(refundedAmount, payment.currency as PaymentCurrency),
    });

    if (charge.refunded) {
      await this.cancelActiveSubscriptionForRefund(payment.userId);
    }
    this.logger.log(`Refund confirmed for payment ${payment.id}`);
  }

  // Version-guarded equivalent of the old
  // `updateMany({ where: { userId, status: ACTIVE }, data: { status: CANCELLED } })`.
  // That form conditions on status matching at write time, which offers some
  // built-in protection, but doesn't participate in the same version counter
  // as every other subscription write (e.g. a concurrent onSubscriptionChanged
  // upsert), so two writers can still interleave without either detecting it.
  // Reading id+version first and guarding on version puts this write through
  // the same conflict-detection path as the rest of the subscription writes.
  private async cancelActiveSubscriptionForRefund(userId: string): Promise<void> {
    const sub = await this.prisma.subscription.findUnique({
      where: { userId },
      select: { id: true, version: true, status: true },
    });
    if (!sub || sub.status !== UserSubscriptionStatus.ACTIVE) return; // nothing to cancel

    const result = await this.prisma.subscription.updateMany({
      where: { id: sub.id, version: sub.version },
      data: { status: UserSubscriptionStatus.CANCELLED, cancelledAt: new Date(), version: { increment: 1 } },
    });
    if (result.count === 0) {
      this.logger.error(
        `Optimistic lock conflict cancelling subscription after refund: userId=${userId} ` +
        `subscriptionId=${sub.id} expectedVersion=${sub.version}`,
      );
      throw new OptimisticLockError(sub.id, 'subscription-cancel-on-refund');
    }
  }

  private async onSubscriptionChanged(stripeSub: Stripe.Subscription, _eventType: string) {
    const userId = stripeSub.metadata?.userId;
    if (!userId) {
      this.logger.warn(`Subscription ${stripeSub.id} has no userId in metadata`);
      return;
    }
    const status = this.mapStripeSubscriptionStatus(stripeSub.status);
    const plan = (stripeSub.metadata?.plan as UserSubscriptionPlan | undefined)
      ?? UserSubscriptionPlan.BASIC;

    await this.upsertSubscriptionWithLock(
      userId,
      {
        plan, status,
        gatewaySubscriptionId: stripeSub.id,
        currentPeriodStart: new Date(stripeSub.current_period_start * 1000),
        currentPeriodEnd:   new Date(stripeSub.current_period_end   * 1000),
        cancelAtPeriodEnd: stripeSub.cancel_at_period_end,
        cancelledAt: stripeSub.canceled_at ? new Date(stripeSub.canceled_at * 1000) : null,
      },
      {
        status,
        currentPeriodStart: new Date(stripeSub.current_period_start * 1000),
        currentPeriodEnd:   new Date(stripeSub.current_period_end   * 1000),
        cancelAtPeriodEnd: stripeSub.cancel_at_period_end,
        cancelledAt: stripeSub.canceled_at ? new Date(stripeSub.canceled_at * 1000) : null,
      },
    );
    this.logger.log(`Subscription ${stripeSub.id} updated to status=${status} for user ${userId}`);
  }

  private async onInvoicePaymentFailed(invoice: Stripe.Invoice) {
    const subId = typeof invoice.subscription === 'string'
      ? invoice.subscription : invoice.subscription?.id;
    if (!subId) return;

    const sub = await this.prisma.subscription.findFirst({
      where: { gatewaySubscriptionId: subId },
      select: { id: true, version: true },
    });
    if (!sub) {
      this.logger.warn(`Invoice payment failed for unknown subscription ${subId}`);
      return;
    }

    const result = await this.prisma.subscription.updateMany({
      where: { id: sub.id, version: sub.version },
      data: { status: UserSubscriptionStatus.PAST_DUE, version: { increment: 1 } },
    });
    if (result.count === 0) {
      this.logger.error(
        `Optimistic lock conflict marking subscription past_due: gatewaySubscriptionId=${subId} ` +
        `subscriptionId=${sub.id} expectedVersion=${sub.version}`,
      );
      throw new OptimisticLockError(sub.id, 'status→PAST_DUE');
    }
    this.logger.warn(`Invoice payment failed for subscription ${subId} — status set to past_due`);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // PRIVATE HELPERS
  // ─────────────────────────────────────────────────────────────────────────

  // PaymentPlan (billing DTO enum) and UserSubscriptionPlan (Prisma column
  // enum) intentionally share the same string labels — see the ADR comment
  // on the Subscription model in schema.prisma. This mapping is written out
  // explicitly (instead of a blind cast) so that if either enum ever gains a
  // new member without the other, TypeScript fails to compile here instead
  // of silently persisting a bad value.
  private static readonly PAYMENT_PLAN_TO_DB_PLAN: Record<PaymentPlan, UserSubscriptionPlan> = {
    [PaymentPlan.BASIC]:      UserSubscriptionPlan.BASIC,
    [PaymentPlan.PREMIUM]:    UserSubscriptionPlan.PREMIUM,
    [PaymentPlan.ENTERPRISE]: UserSubscriptionPlan.ENTERPRISE,
    [PaymentPlan.BUYER]:      UserSubscriptionPlan.BUYER,
  };

  private async upsertSubscription(userId: string, plan: PaymentPlan) {
    const dbPlan = PaymentsService.PAYMENT_PLAN_TO_DB_PLAN[plan];
    // BUG FIX: this used to write only { plan, status: ACTIVE } — no
    // currentPeriodStart/currentPeriodEnd. Every caller of upsertSubscription
    // is a *non-Stripe* gateway confirmation (ZainCash, FastPay, AsiaHawala —
    // the gateways actually used by most dealers/buyers in Iraq); Stripe's
    // own webhook path sets these fields separately from Stripe's billing
    // cycle. Without this fix, ListingPermissionService's `currentPeriodEnd
    // > now` check never matched, so a dealer or buyer who paid through a
    // local gateway was silently never unlocked — they'd still get blocked
    // once their free trial ran out, despite having paid.
    const now = new Date();
    const periodEnd = new Date(now);
    periodEnd.setDate(periodEnd.getDate() + PLAN_DURATION_DAYS[plan]);

    await this.upsertSubscriptionWithLock(
      userId,
      { plan: dbPlan, status: UserSubscriptionStatus.ACTIVE, currentPeriodStart: now, currentPeriodEnd: periodEnd },
      { plan: dbPlan, status: UserSubscriptionStatus.ACTIVE, currentPeriodStart: now, currentPeriodEnd: periodEnd },
    );
  }

  // ── Shared version-guarded upsert for the Subscription model ──────────────
  // Used everywhere a webhook or payment-completion path needs "create if
  // missing, otherwise update" semantics on Subscription without falling
  // back to Prisma's plain `upsert` (which has no concept of version and
  // will happily last-write-wins the update branch). Per F1.3, a version
  // conflict on the update branch is surfaced immediately as
  // OptimisticLockError — it is NOT retried internally, so the caller
  // (ultimately the webhook handler) can let the gateway's own retry
  // mechanism redeliver instead of us guessing at a fix.
  private async upsertSubscriptionWithLock(
    userId: string,
    createData: Record<string, unknown>,
    updateData: Record<string, unknown>,
  ): Promise<void> {
    const existing = await this.prisma.subscription.findUnique({
      where: { userId },
      select: { id: true, version: true },
    });

    if (!existing) {
      try {
        await this.prisma.subscription.create({ data: { userId, ...createData } });
        return;
      } catch (err: any) {
        if (err.code === 'P2002') {
          // A concurrent request created this user's subscription first.
          this.logger.error(
            `Optimistic lock conflict creating subscription: userId=${userId} ` +
            `(a concurrent request created it first)`,
          );
          throw new OptimisticLockError(userId, 'subscription-create');
        }
        throw err;
      }
    }

    const result = await this.prisma.subscription.updateMany({
      where: { id: existing.id, version: existing.version },
      data: { ...updateData, version: { increment: 1 } },
    });
    if (result.count === 0) {
      this.logger.error(
        `Optimistic lock conflict updating subscription: userId=${userId} ` +
        `subscriptionId=${existing.id} expectedVersion=${existing.version}`,
      );
      throw new OptimisticLockError(existing.id, 'subscription-update');
    }
  }

  private async cancelStalePending(userId: string, plan: string, gateway: string) {
    const existing = await (this.prisma.payment as any).findFirst({
      where: { userId, plan, status: PaymentStatus.PENDING, gateway: this.toPaymentGatewayEnum(gateway) },
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
    extraData: Record<string, unknown> = {},
  ) {
    // BUG #10 FIX: both writes now happen inside a single DB transaction, so a
    // crash/restart between them can never leave a payment status change with
    // no corresponding TransactionLog row.
    //
    // F1.3: optimistic locking. Read the row's current version, then write
    // WHERE id = ... AND version = <version we read>, bumping version by 1.
    // If 0 rows are affected, someone else (almost always a racing webhook
    // retry) updated this payment between our read and our write — throw
    // OptimisticLockError rather than silently overwriting whatever they
    // wrote, or guessing at a retry ourselves.
    await this.prisma.runInTransaction(async (tx) => {
      const current = await tx.payment.findUniqueOrThrow({
        where: { id: paymentId },
        select: { version: true, status: true, gatewayId: true },
      });

      const result = await tx.payment.updateMany({
        where: { id: paymentId, version: current.version },
        data: {
          status,
          gatewayStatus: (log.gatewayData as Record<string, any>)?.['stripeStatus'] ?? status,
          failureReason: log.errorMessage ?? null,
          ...(status === PaymentStatus.COMPLETED || status === PaymentStatus.REFUNDED
            ? { nextRetryAt: null } : {}),
          ...extraData,
          version: { increment: 1 },
        },
      });

      if (result.count === 0) {
        this.logger.error(
          `Optimistic lock conflict: paymentId=${paymentId} attemptedStatus=${status} ` +
          `fromStatus=${current.status} gatewayId=${current.gatewayId ?? 'n/a'} ` +
          `expectedVersion=${current.version}`,
        );
        throw new OptimisticLockError(paymentId, `status→${status}`, current.gatewayId ?? undefined);
      }

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
    // F1.4: capture the FX rate at the moment this log entry is written, not
    // just on the parent Payment — a refund logged days later should record
    // the rate as of the refund, not silently inherit the original charge's
    // rate.
    let exchangeRateToUsd: number | null = null;
    let amountUsd: number | null = null;
    if (data.amount !== undefined && data.currency) {
      exchangeRateToUsd = await this.exchangeRate.getRateToUsd(data.currency);
      amountUsd = this.computeAmountUsd(data.amount, exchangeRateToUsd);
    }

    await tx.transactionLog.create({
      data: {
        paymentId,
        event: data.event,
        status: data.status ?? '',
        amount: data.amount !== undefined ? data.amount : undefined,
        currency: data.currency,
        exchangeRateToUsd,
        amountUsd,
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

  // ── F1.4: FX rate capture ─────────────────────────────────────────────────

  private computeAmountUsd(amount: number, exchangeRateToUsd: number | null): number | null {
    if (exchangeRateToUsd === null) return null;
    // 8 dp matches the Decimal(20,8) column — enough headroom for currencies
    // like IQD where the per-unit USD rate itself has many significant digits.
    return Math.round(amount * exchangeRateToUsd * 1e8) / 1e8;
  }

  /**
   * Fetches the current FX rate for `currency` and returns the trio of
   * fields every Payment.create() call site needs. Never throws — a failed
   * FX lookup stores nulls rather than blocking payment creation (see
   * ExchangeRateService.getRateToUsd).
   */
  private async buildFxSnapshot(amount: number, currency: string) {
    const exchangeRateToUsd = await this.exchangeRate.getRateToUsd(currency);
    return {
      exchangeRateToUsd,
      amountUsd: this.computeAmountUsd(amount, exchangeRateToUsd),
      settlementCurrency: SETTLEMENT_CURRENCY,
    };
  }

  private mapStripeSubscriptionStatus(stripeStatus: Stripe.Subscription.Status): UserSubscriptionStatus {
    const map: Record<Stripe.Subscription.Status, UserSubscriptionStatus> = {
      active: UserSubscriptionStatus.ACTIVE,
      canceled: UserSubscriptionStatus.CANCELLED,
      incomplete: UserSubscriptionStatus.INACTIVE,
      incomplete_expired: UserSubscriptionStatus.INACTIVE,
      past_due: UserSubscriptionStatus.PAST_DUE,
      paused: UserSubscriptionStatus.INACTIVE,
      trialing: UserSubscriptionStatus.TRIALING,
      unpaid: UserSubscriptionStatus.PAST_DUE,
    };
    return map[stripeStatus] ?? UserSubscriptionStatus.INACTIVE;
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
