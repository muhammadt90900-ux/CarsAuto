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

// ADDED (Referral & Rewards System): emitted from DealersService.create()
// whenever a new dealer application carries a referralCode — the sole
// signal ReferralListeners needs to resolve the code, validate it (exists /
// not self-referral / not already referred), and create the Referral row.
// DealersService never imports the referrals module directly.
export class DealerAppliedEvent {
  constructor(
    public readonly dealerId: string,
    public readonly userId: string,
    public readonly referralCodeUsed?: string,
  ) {}
}
