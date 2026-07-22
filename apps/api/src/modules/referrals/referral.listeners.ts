// apps/api/src/modules/referrals/referral.listeners.ts
//
// Same F-ARCH pattern as dealer.listeners.ts — every producer
// (AuthService, DealersService, ListingsService) only emits events and has
// zero compile-time knowledge that the Referral & Rewards System exists.
// Every handler is fire-and-forget: it catches its own errors and never
// throws, so a failure here can never surface on the original HTTP request.

import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { ReferralsService } from './referrals.service';
import {
  DealerAppliedEvent,
  DealerVerifiedEvent,
  UserEmailVerifiedEvent,
  ListingCreatedEvent,
} from '../../common/events';

@Injectable()
export class ReferralListeners {
  private readonly logger = new Logger(ReferralListeners.name);

  constructor(private readonly referrals: ReferralsService) {}

  @OnEvent('dealer.applied')
  async handleDealerApplied(event: DealerAppliedEvent): Promise<void> {
    try {
      await this.referrals.onDealerApplied(event);
    } catch (err) {
      this.logger.warn(`handleDealerApplied failed for dealer ${event.dealerId}: ${(err as Error).message}`);
    }
  }

  @OnEvent('dealer.verified')
  async handleDealerVerified(event: DealerVerifiedEvent): Promise<void> {
    try {
      await this.referrals.onDealerVerified(event);
    } catch (err) {
      this.logger.warn(`handleDealerVerified failed for dealer ${event.dealerId}: ${(err as Error).message}`);
    }
  }

  @OnEvent('user.email_verified')
  async handleUserEmailVerified(event: UserEmailVerifiedEvent): Promise<void> {
    try {
      await this.referrals.onUserEmailVerified(event);
    } catch (err) {
      this.logger.warn(`handleUserEmailVerified failed for user ${event.userId}: ${(err as Error).message}`);
    }
  }

  @OnEvent('listing.created')
  async handleListingCreated(event: ListingCreatedEvent): Promise<void> {
    try {
      await this.referrals.onListingCreated(event);
    } catch (err) {
      this.logger.warn(`handleListingCreated (referral) failed for listing ${event.listingId}: ${(err as Error).message}`);
    }
  }
}
