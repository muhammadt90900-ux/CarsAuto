// apps/api/src/modules/payments/guards/stripe-webhook.guard.ts
//
// Validates the Stripe-Signature header before the handler runs.
// Must be paired with the raw body middleware (see main.ts comment below).
//
// In main.ts, before app.useGlobalPipes(), add:
//
//   app.use(
//     '/payments/webhook',
//     express.raw({ type: 'application/json' }),
//   );
//
// This preserves the raw Buffer that Stripe needs for HMAC verification.
// All other routes continue to use the standard JSON body parser.

import {
  CanActivate,
  ExecutionContext,
  Injectable,
  BadRequestException,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import Stripe from 'stripe';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class StripeWebhookGuard implements CanActivate {
  private readonly logger = new Logger(StripeWebhookGuard.name);

  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<any>();

    const sig = req.headers['stripe-signature'];
    if (!sig) {
      throw new BadRequestException('Missing Stripe-Signature header');
    }

    const secret = this.config.get<string>('STRIPE_WEBHOOK_SECRET');
    if (!secret) {
      this.logger.error('STRIPE_WEBHOOK_SECRET is not configured');
      throw new UnauthorizedException('Webhook not configured');
    }

    // Raw body must be a Buffer (set by express.raw middleware)
    if (!Buffer.isBuffer(req.body)) {
      throw new BadRequestException(
        'Webhook body must be raw Buffer. ' +
        'Ensure /payments/webhook uses express.raw() middleware.',
      );
    }

    try {
      const stripe = new Stripe(this.config.get<string>('STRIPE_SECRET_KEY')!, {
        apiVersion: '2023-10-16',
      });

      // Attach the verified event to the request for the handler to consume
      req.stripeEvent = stripe.webhooks.constructEvent(req.body, sig, secret);
    } catch (err: any) {
      this.logger.warn(`Webhook signature verification failed: ${err.message}`);
      throw new UnauthorizedException(`Webhook signature invalid: ${err.message}`);
    }

    return true;
  }
}
