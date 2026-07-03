// apps/api/src/modules/dealers/dealer.listeners.ts
//
// F-ARCH fix: this is the other half of the ListingsService decoupling —
// ListingsService now only emits events (see common/events/), and this
// class is the sole place that reacts to them on the dealer side.
// ListingsService has zero compile-time knowledge this class exists.
//
// Counter semantics:
//   totalListings  — lifetime count of listings ever created by this dealer (never decremented)
//   activeListings — currently-live count (incremented on create, decremented on sold/deleted)
// Neither counter previously existed anywhere in the codebase before this
// fix — they were schema fields that nothing wrote to.
//
// DRIFT WARNING: every handler below is fire-and-forget — on failure it
// logs a warning and moves on (see the comment right below this one). That
// means a failed write here desyncs the counter with no automatic retry.
// modules/dealers/tasks/dealer-reconciliation.service.ts is the fix: a
// nightly BullMQ job (plus an admin on-demand endpoint) recomputes these
// counters from source-of-truth tables and self-heals any drift it finds.

import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CacheService } from '../../common/cache/cache.service';
import { DealersService } from './dealers.service';
import {
  ListingCreatedEvent,
  ListingSoldEvent,
  ListingDeletedEvent,
  DealerReviewAddedEvent,
  DealerFollowedEvent,
} from '../../common/events';

@Injectable()
export class DealerListeners {
  private readonly logger = new Logger(DealerListeners.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
    private readonly dealers: DealersService,
  ) {}

  // Events are fire-and-forget from the emitter's perspective — every
  // handler below catches its own errors and never throws, so a failure
  // here can never surface as an error on the original HTTP request that
  // triggered the event.

  @OnEvent('listing.created')
  async handleListingCreated(event: ListingCreatedEvent): Promise<void> {
    if (!event.dealerId) return; // private seller, no dealer counters to update
    try {
      await this.prisma.dealer.update({
        where: { id: event.dealerId },
        data: { totalListings: { increment: 1 }, activeListings: { increment: 1 } },
      });
      this.cache.del('dealers:list:');

      await this.dealers.notifyFollowersOfNewListing(event.dealerId, event.listingId);
    } catch (err) {
      this.logger.warn(
        `handleListingCreated failed for listing ${event.listingId}: ${(err as Error).message}`,
      );
    }
  }

  @OnEvent('listing.sold')
  async handleListingSold(event: ListingSoldEvent): Promise<void> {
    if (!event.dealerId) return;
    try {
      await this.prisma.dealer.update({
        where: { id: event.dealerId },
        data: { activeListings: { decrement: 1 } },
      });
      this.cache.del('dealers:list:');
    } catch (err) {
      this.logger.warn(
        `handleListingSold failed for listing ${event.listingId}: ${(err as Error).message}`,
      );
    }
  }

  @OnEvent('listing.deleted')
  async handleListingDeleted(event: ListingDeletedEvent): Promise<void> {
    if (!event.dealerId) return;
    try {
      await this.prisma.dealer.update({
        where: { id: event.dealerId },
        data: { activeListings: { decrement: 1 } },
      });
      this.cache.del('dealers:list:');
    } catch (err) {
      this.logger.warn(
        `handleListingDeleted failed for listing ${event.listingId}: ${(err as Error).message}`,
      );
    }
  }

  // ── Dealer-domain events (additive — DealersService still does its own
  // direct rating-recompute / follower-count writes; these are just signals
  // for other future consumers, e.g. analytics) ───────────────────────────────

  @OnEvent('dealer.review.added')
  async handleReviewAdded(event: DealerReviewAddedEvent): Promise<void> {
    try {
      this.logger.log(
        `Dealer ${event.dealerId} received a ${event.rating}★ review from ${event.reviewerId}`,
      );
      // Placeholder for future consumers (e.g. admin moderation queue,
      // analytics rollups) — DealersService.createReview() already
      // recomputes the rating itself; this event doesn't duplicate that.
    } catch (err) {
      this.logger.warn(`handleReviewAdded failed: ${(err as Error).message}`);
    }
  }

  @OnEvent('dealer.followed')
  async handleDealerFollowed(event: DealerFollowedEvent): Promise<void> {
    try {
      this.logger.log(`Dealer ${event.dealerId} gained a new follower: ${event.followerId}`);
      // Placeholder for future consumers — DealersService.follow() already
      // sends the "someone followed you" notification itself; this event
      // doesn't duplicate that.
    } catch (err) {
      this.logger.warn(`handleDealerFollowed failed: ${(err as Error).message}`);
    }
  }
}
