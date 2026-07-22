/**
 * Prisma enum re-exports.
 *
 * F-FIX: this file used to hand-declare its own copy of every enum below,
 * "mirroring" prisma/schema.prisma. That created a SECOND, nominally
 * distinct set of enum types living alongside the real ones Prisma
 * generates into @prisma/client — TypeScript enums are compared
 * nominally, not structurally, so `ListingType` from here and
 * `$Enums.ListingType` from @prisma/client were NOT assignable to each
 * other even though their members were identical strings. Any code path
 * where a raw Prisma query result (which carries the *real* enum type)
 * met a value typed via this file's *mirror* enum produced exactly this
 * class of error:
 *
 *   "Two different types with this name exist, but they are unrelated."
 *
 * The mirror had also silently drifted out of sync with the schema
 * (BodyType was missing BUS and OTHER), which a hand-maintained copy
 * will always be at risk of. Re-exporting from @prisma/client eliminates
 * both problems: there is now exactly one `ListingType` (etc.) in the
 * whole codebase, and it can never go stale relative to schema.prisma.
 *
 * Requires `npx prisma generate` (apps/api) to have been run at least
 * once so @prisma/client exists — no live DB connection needed for that.
 */
export {
  UserRole,
  ListingType,
  ListingCondition,
  ListingStatus,
  FuelType,
  TransmissionType,
  DrivetrainType,
  BodyType,
  DealerTier,
  DealerStatus,
  SubscriptionPlan,
  SubscriptionStatus,
  PaymentStatus,
  PaymentGateway,
  ReportStatus,
  ChatStatus,
  ContactRequestStatus,
  BetaRegistrationStatus,
} from '@prisma/client';
