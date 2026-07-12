/**
 * apps/api/src/modules/suspicious-activity/suspicious-activity.listener.ts
 *
 * Trust & Safety Prompt 5. Same fire-and-forget/decoupling pattern as
 * duplicate-detection.listener.ts and search-index.listener.ts — neither
 * ListingsService nor ChatService has any compile-time knowledge this
 * class exists.
 */

import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { ListingSavedEvent, MessageSentEvent } from '../../common/events';
import { SuspiciousActivityService } from './suspicious-activity.service';

@Injectable()
export class SuspiciousActivityListener {
  private readonly logger = new Logger(SuspiciousActivityListener.name);

  constructor(private readonly suspiciousActivity: SuspiciousActivityService) {}

  @OnEvent('listing.saved')
  async handleListingSaved(event: ListingSavedEvent): Promise<void> {
    if (!event.isNew) return; // RAPID_RELIST only applies to newly created listings
    try {
      await this.suspiciousActivity.checkRapidRelist(event.listingId, event.userId);
    } catch (err) {
      this.logger.warn(`RAPID_RELIST check failed for listing ${event.listingId}: ${(err as Error).message}`);
    }
  }

  @OnEvent('message.sent')
  async handleMessageSent(event: MessageSentEvent): Promise<void> {
    try {
      await this.suspiciousActivity.checkMessage(event.senderId, event.content, event.messageType);
    } catch (err) {
      this.logger.warn(`Message suspicious-activity check failed for chat ${event.chatId}: ${(err as Error).message}`);
    }
  }
}
