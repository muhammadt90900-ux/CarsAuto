// apps/api/src/modules/subscriptions/subscriptions.controller.ts

import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { SubscriptionsService } from './subscriptions.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { EmailVerifiedGuard } from '../../common/guards/email-verified.guard';
import { CreateSubscriptionIntentDto, ConfirmSubscriptionDto } from './dto/subscription.dto';

@Controller('subscriptions')
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  /**
   * POST /api/subscriptions
   * Create a Stripe PaymentIntent for the chosen plan.
   * Returns { clientSecret, plan, amount, currency }
   */
  @UseGuards(JwtAuthGuard, EmailVerifiedGuard)
  @Post()
  @HttpCode(HttpStatus.CREATED)
  createIntent(@Request() req: any, @Body() dto: CreateSubscriptionIntentDto) {
    return this.subscriptionsService.createIntent(req.user.userId, dto);
  }

  /**
   * POST /api/subscriptions/confirm
   * Verify Stripe payment and provision the subscription.
   */
  @UseGuards(JwtAuthGuard)
  @Post('confirm')
  @HttpCode(HttpStatus.CREATED)
  confirm(@Request() req: any, @Body() dto: ConfirmSubscriptionDto) {
    return this.subscriptionsService.confirmSubscription(req.user.userId, dto);
  }

  /**
   * GET /api/subscriptions/status
   * Returns the caller's current permission status (used by the frontend
   * to decide whether to show the form or the upgrade prompt).
   */
  @UseGuards(JwtAuthGuard)
  @Get('status')
  getStatus(@Request() req: any) {
    return this.subscriptionsService.getStatus(req.user.userId);
  }
}
