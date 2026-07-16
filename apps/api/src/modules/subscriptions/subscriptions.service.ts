// apps/api/src/modules/subscriptions/subscriptions.service.ts

import {
  Injectable,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { PaymentsService } from '../payments/payments.service';
import {
  SubPlan,
  SUB_PLAN_PRICES,
  SUB_PLAN_DAYS,
  CreateSubscriptionIntentDto,
  ConfirmSubscriptionDto,
} from './dto/subscription.dto';
import { ListingPermissionService } from '../../common/permissions/listing-permission.service';

@Injectable()
export class SubscriptionsService {
  private readonly logger = new Logger(SubscriptionsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly paymentsService: PaymentsService,
    private readonly permissionService: ListingPermissionService,
  ) {}

  // ─────────────────────────────────────────────────────────────────────────
  // ADMIN FIX: the admin/subscriptions frontend page called GET
  // /admin/subscriptions/dealers and GET /admin/subscriptions/users, but no
  // controller in the API mounted anything at that path. Every load of the
  // admin subscriptions page 404'd. These two methods back a new
  // AdminSubscriptionsController.
  // ─────────────────────────────────────────────────────────────────────────

  async adminListDealerSubscriptions(params: {
    page?: number; limit?: number; plan?: string; status?: string;
  }) {
    const page  = params.page  && params.page  > 0 ? params.page  : 1;
    const limit = params.limit && params.limit > 0 ? params.limit : 20;

    const where: Record<string, unknown> = {};
    if (params.plan)   where.plan   = params.plan;
    if (params.status) where.status = params.status;

    const [data, total] = await Promise.all([
      this.prisma.dealerSubscription.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          dealer: {
            select: {
              id: true, slug: true, nameEn: true,
              user: { select: { name: true, email: true } },
            },
          },
        },
      }),
      this.prisma.dealerSubscription.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  async adminListUserSubscriptions(params: {
    page?: number; limit?: number; status?: string;
  }) {
    const page  = params.page  && params.page  > 0 ? params.page  : 1;
    const limit = params.limit && params.limit > 0 ? params.limit : 20;

    // NOTE: Subscription.status is a lowercase convention
    // (active/past_due/cancelled/trialing/inactive), unlike
    // DealerSubscription.status above which is the uppercase
    // SubscriptionStatus enum — see schema.prisma comments on both models.
    const where: Record<string, unknown> = {};
    if (params.status) where.status = params.status;

    const [data, total] = await Promise.all([
      this.prisma.subscription.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: { user: { select: { id: true, name: true, email: true, role: true } } },
      }),
      this.prisma.subscription.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  // ── POST /api/subscriptions ───────────────────────────────────────────────
  // Creates a Stripe PaymentIntent and returns the clientSecret to the frontend.

  async createIntent(userId: string, dto: CreateSubscriptionIntentDto) {
    // Verify caller is a DEALER
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { role: true },
    });
    if (user.role !== 'DEALER' && user.role !== 'ADMIN') {
      throw new ForbiddenException({
        ku: 'تەنها فرۆشیار دەتوانێت بەشداری بکات',
        en: 'Only dealers can purchase a subscription',
        code: 'ROLE_NOT_DEALER',
      });
    }

    const amount   = SUB_PLAN_PRICES[dto.plan];
    const stripe   = this.paymentsService.getStripe();
    const intent   = await stripe.paymentIntents.create({
      amount,
      currency: 'usd',
      metadata: { userId, plan: dto.plan, type: 'dealer_subscription' },
      automatic_payment_methods: { enabled: true },
    });

    this.logger.log(`Subscription intent created: ${intent.id} for user ${userId} plan ${dto.plan}`);

    return {
      clientSecret: intent.client_secret,
      plan:         dto.plan,
      amount:       amount / 100, // dollars for display
      currency:     'USD',
    };
  }

  // ── POST /api/subscriptions/confirm ──────────────────────────────────────
  // Verifies Stripe payment succeeded and creates the DB subscription record.

  async confirmSubscription(userId: string, dto: ConfirmSubscriptionDto) {
    const stripe = this.paymentsService.getStripe();

    // Verify payment actually succeeded on Stripe's side
    const intent = await stripe.paymentIntents.retrieve(dto.stripePaymentIntentId);
    if (intent.status !== 'succeeded') {
      throw new BadRequestException(
        `Payment has not succeeded (status: ${intent.status}). Please complete payment first.`,
      );
    }

    // Guard against double-confirming the same intent
    const existing = await this.prisma.dealerSubscription.findFirst({
      where: { gatewaySubscriptionId: dto.stripePaymentIntentId },
    });
    if (existing) {
      return existing; // idempotent — return the already-created record
    }

    // Resolve start date: if the dealer has a current active sub, chain from its endDate
    const activeSub = await this.prisma.dealerSubscription.findFirst({
      where: { dealer: { userId }, currentPeriodEnd: { gt: new Date() }, status: 'ACTIVE' },
      orderBy: { currentPeriodEnd: 'desc' },
    });

    const startDate = activeSub ? (activeSub.currentPeriodEnd ?? new Date()) : new Date();
    const endDate   = new Date(startDate);
    endDate.setDate(endDate.getDate() + SUB_PLAN_DAYS[dto.plan as SubPlan]);

    const subscription = await this.prisma.dealerSubscription.create({
      data: {
        dealer:             { connect: { userId } },
        plan:               dto.plan as any,
        currentPeriodStart: startDate,
        currentPeriodEnd:   endDate,
        gatewaySubscriptionId: dto.stripePaymentIntentId,
      },
    });

    this.logger.log(
      `Subscription confirmed for user ${userId}: plan=${dto.plan} ` +
      `start=${startDate.toISOString()} end=${endDate.toISOString()}`,
    );

    return subscription;
  }

  // ── GET /api/subscriptions/status ────────────────────────────────────────

  async getStatus(userId: string) {
    return this.permissionService.getPermissionStatus(userId);
  }
}
