// apps/api/src/modules/search-indexing/search-index.listener.ts
//
// Search Architecture Phase 1: the search-side counterpart to
// modules/dealers/dealer.listeners.ts. Reacts to the same listing domain
// events dealer.listeners.ts already reacts to (plus the new
// ListingUpdatedEvent), but ListingsService has zero compile-time
// knowledge this class exists either — same decoupling, same
// fire-and-forget contract.
//
// Deliberately thin: every handler ONLY enqueues a BullMQ job. It never
// calls Meilisearch directly — that happens in
// apps/worker/src/processors/search-index.processor.ts, so a slow or
// unreachable search engine can never add latency to the HTTP request (or
// to any other listener) that triggered the event.

import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import {
  ListingCreatedEvent,
  ListingUpdatedEvent,
  ListingDeletedEvent,
  ListingSoldEvent,
} from '../../common/events';
import { SEARCH_INDEX_QUEUE, SearchIndexJobData } from './search-index.constants';

@Injectable()
export class SearchIndexListener {
  private readonly logger = new Logger(SearchIndexListener.name);

  constructor(@InjectQueue(SEARCH_INDEX_QUEUE) private readonly queue: Queue<SearchIndexJobData>) {}

  // Every handler below catches its own errors and never throws — same
  // fire-and-forget contract as every other listener on these events
  // (see dealer.listeners.ts's header comment for the rationale).

  @OnEvent('listing.created')
  async handleListingCreated(event: ListingCreatedEvent): Promise<void> {
    await this.enqueue('upsert', event.listingId);
  }

  @OnEvent('listing.updated')
  async handleListingUpdated(event: ListingUpdatedEvent): Promise<void> {
    await this.enqueue('upsert', event.listingId);
  }

  @OnEvent('listing.sold')
  async handleListingSold(event: ListingSoldEvent): Promise<void> {
    // Sold listings still exist and are still searchable-by-status in some
    // views, so we re-index (status → SOLD) rather than delete.
    await this.enqueue('upsert', event.listingId);
  }

  @OnEvent('listing.deleted')
  async handleListingDeleted(event: ListingDeletedEvent): Promise<void> {
    await this.enqueue('delete', event.listingId);
  }

  private async enqueue(action: SearchIndexJobData['action'], listingId: string): Promise<void> {
    try {
      await this.queue.add(
        action,
        { action, listingId },
        {
          attempts: 5,
          backoff: { type: 'exponential', delay: 2_000 },
          removeOnComplete: true,
          removeOnFail: 1_000,
        },
      );
    } catch (err) {
      this.logger.warn(
        `Failed to enqueue search-index ${action} job for listing ${listingId}: ${(err as Error).message}`,
      );
    }
  }
}
