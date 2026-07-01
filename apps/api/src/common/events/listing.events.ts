// apps/api/src/common/events/listing.events.ts
//
// F-ARCH fix: domain events emitted by ListingsService. Listened to by
// DealerListeners (apps/api/src/modules/dealers/dealer.listeners.ts) so that
// ListingsService no longer needs to inject DealersService directly —
// removing the forwardRef(() => DealersModule) circular-dependency
// workaround that was in listings.module.ts, and making it possible to
// extract either module into its own service later without the other.

export class ListingCreatedEvent {
  constructor(
    public readonly listingId: string,
    public readonly userId: string,
    public readonly dealerId: string | null,
    public readonly type: string,
  ) {}
}

export class ListingSoldEvent {
  constructor(
    public readonly listingId: string,
    public readonly userId: string,
    public readonly dealerId: string | null,
  ) {}
}

export class ListingDeletedEvent {
  constructor(
    public readonly listingId: string,
    public readonly dealerId: string | null,
  ) {}
}
