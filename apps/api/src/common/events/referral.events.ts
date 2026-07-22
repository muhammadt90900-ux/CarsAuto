// apps/api/src/common/events/referral.events.ts
//
// F-ARCH fix (same pattern as listing.events.ts / dealer.events.ts): domain
// events consumed by ReferralListeners (modules/referrals/referral.listeners.ts)
// so DealersService and AuthService don't need compile-time knowledge that
// the Referral & Rewards System exists.

// Emitted once, the moment a dealer first transitions to VERIFIED. Not
// re-emitted on later re-verification (tier upgrades etc.) — ReferralsService
// only cares about the first approval.
export class DealerVerifiedEvent {
  constructor(
    public readonly dealerId: string,
    public readonly userId: string,
  ) {}
}

// Emitted once, the moment a user's email is confirmed via
// AuthService.verifyEmail().
export class UserEmailVerifiedEvent {
  constructor(public readonly userId: string) {}
}
