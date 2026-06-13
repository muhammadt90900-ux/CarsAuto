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
    const existing = await this.prisma.userDealerSubscription.findFirst({
      where: { stripeId: dto.stripePaymentIntentId },
    });
    if (existing) {
      return existing; // idempotent — return the already-created record
    }

    // Resolve start date: if the dealer has a current active sub, chain from its endDate
    const activeSub = await this.prisma.userDealerSubscription.findFirst({
      where: { userId, endDate: { gt: new Date() } },
      orderBy: { endDate: 'desc' },
    });

    const startDate = activeSub ? activeSub.endDate : new Date();
    const endDate   = new Date(startDate);
    endDate.setDate(endDate.getDate() + SUB_PLAN_DAYS[dto.plan as SubPlan]);

    const subscription = await this.prisma.userDealerSubscription.create({
      data: {
        userId,
        plan:     dto.plan as any,
        startDate,
        endDate,
        paidAt:   new Date(),
        stripeId: dto.stripePaymentIntentId,
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
