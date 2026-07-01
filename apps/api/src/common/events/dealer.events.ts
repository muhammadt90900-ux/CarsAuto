// apps/api/src/common/events/dealer.events.ts
//
// F-ARCH fix: domain events emitted by DealersService for its own
// review/follow operations. Unlike the listing.* events, these don't
// replace any existing direct logic (rating recompute and follower-count
// stay as direct, synchronous DealersService writes — they're intrinsic to
// the operation, not cross-service coupling). They're additive signals for
// other modules (analytics, future notification fan-out) to react to
// without DealersService needing to know who's listening.

export class DealerReviewAddedEvent {
  constructor(
    public readonly dealerId: string,
    public readonly reviewerId: string,
    public readonly rating: number,
  ) {}
}

export class DealerFollowedEvent {
  constructor(
    public readonly dealerId: string,
    public readonly followerId: string,
  ) {}
}
