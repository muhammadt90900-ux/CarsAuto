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

// ADDED (Search Architecture Phase 1): emitted from every ListingsService
// code path that mutates a listing's SEARCHABLE fields (title, price,
// status, spec, location) — NOT emitted on create() (ListingCreatedEvent
// already covers that) or on soft-delete (ListingDeletedEvent already
// covers that). This is the signal SearchIndexListener
// (apps/api/src/modules/search-indexing/search-index.listener.ts) listens
// for to enqueue a re-index job. Same shape as ListingCreatedEvent by
// convention — dealerId is carried along even though today's listener
// doesn't need it, so a future consumer doesn't have to change the event
// payload to get it.
export class ListingUpdatedEvent {
  constructor(
    public readonly listingId: string,
    public readonly userId: string,
    public readonly dealerId: string | null,
  ) {}
}
