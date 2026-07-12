/**
 * apps/api/src/modules/duplicate-detection/duplicate-detection.listener.ts
 *
 * Trust & Safety Prompt 3. Mirrors search-index.listener.ts's shape
 * exactly (see that file's header comment for the general pattern this
 * codebase uses for domain-event listeners): ListingsService has zero
 * compile-time knowledge this class exists, same decoupling.
 *
 * Deliberately NOT queue-based (unlike SearchIndexListener, which enqueues
 * a BullMQ job) — EventEmitter2.emit() already dispatches to listeners
 * without awaiting them, so this already runs after, not blocking, the
 * HTTP response that triggered it. No new queue infrastructure needed for
 * this prompt's scope.
 */

import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { ListingSavedEvent } from '../../common/events';
import { DuplicateDetectionService } from './duplicate-detection.service';

@Injectable()
export class DuplicateDetectionListener {
  private readonly logger = new Logger(DuplicateDetectionListener.name);

  constructor(private readonly duplicateDetection: DuplicateDetectionService) {}

  @OnEvent('listing.saved')
  async handleListingSaved(event: ListingSavedEvent): Promise<void> {
    try {
      await this.duplicateDetection.checkListing(event.listingId, event.userId);
    } catch (err) {
      // checkListing() already catches per-tier, so this is a last-resort
      // net — same fire-and-forget contract as every other listener here.
      this.logger.warn(
        `Duplicate detection failed for listing ${event.listingId}: ${(err as Error).message}`,
      );
    }
  }
}
