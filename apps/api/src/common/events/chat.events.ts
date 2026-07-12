// apps/api/src/common/events/chat.events.ts
//
// ADDED (Trust & Safety Prompt 5). Mirrors listing.events.ts's shape —
// ChatService has zero compile-time knowledge of who listens to this,
// same decoupling reasoning as ListingSavedEvent.

export class MessageSentEvent {
  constructor(
    public readonly chatId: string,
    public readonly senderId: string,
    public readonly content: string,
    public readonly messageType: string,
  ) {}
}
