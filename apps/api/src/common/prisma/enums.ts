/**
 * Prisma enum declarations
 * These mirror the enums in prisma/schema.prisma exactly.
 * When `prisma generate` runs, @prisma/client will export these —
 * but we declare them here so tsc passes without a live DB connection.
 */

export enum UserRole {
  USER  = 'USER',
  DEALER = 'DEALER',
  ADMIN = 'ADMIN',
}

export enum ListingType {
  CAR         = 'CAR',
  MOTORCYCLE  = 'MOTORCYCLE',
  SPARE_PART  = 'SPARE_PART',
  ACCESSORY   = 'ACCESSORY',
  SERVICE     = 'SERVICE',
}

export enum ListingCondition {
  NEW    = 'NEW',
  USED   = 'USED',
  SALVAGE = 'SALVAGE',
}

export enum ListingStatus {
  ACTIVE       = 'ACTIVE',
  SOLD         = 'SOLD',
  DRAFT        = 'DRAFT',
  EXPIRED      = 'EXPIRED',
  PENDING      = 'PENDING',
  REJECTED     = 'REJECTED',
  UNDER_REVIEW = 'UNDER_REVIEW',
}

export enum FuelType {
  PETROL         = 'PETROL',
  DIESEL         = 'DIESEL',
  HYBRID         = 'HYBRID',
  PLUG_IN_HYBRID = 'PLUG_IN_HYBRID',
  ELECTRIC       = 'ELECTRIC',
  LPG            = 'LPG',
  CNG            = 'CNG',
  HYDROGEN       = 'HYDROGEN',
}

export enum TransmissionType {
  MANUAL        = 'MANUAL',
  AUTOMATIC     = 'AUTOMATIC',
  SEMI_AUTOMATIC = 'SEMI_AUTOMATIC',
  CVT           = 'CVT',
  DUAL_CLUTCH   = 'DUAL_CLUTCH',
}

export enum DrivetrainType {
  FWD     = 'FWD',
  RWD     = 'RWD',
  AWD     = 'AWD',
  FOUR_WD = 'FOUR_WD',
}

export enum BodyType {
  SEDAN        = 'SEDAN',
  HATCHBACK    = 'HATCHBACK',
  SUV          = 'SUV',
  CROSSOVER    = 'CROSSOVER',
  COUPE        = 'COUPE',
  CONVERTIBLE  = 'CONVERTIBLE',
  WAGON        = 'WAGON',
  PICKUP_TRUCK = 'PICKUP_TRUCK',
  VAN          = 'VAN',
  MINIVAN      = 'MINIVAN',
}

export enum DealerTier {
  BASIC    = 'BASIC',
  STANDARD = 'STANDARD',
  GOLD     = 'GOLD',
  PLATINUM = 'PLATINUM',
}

export enum DealerStatus {
  PENDING   = 'PENDING',
  VERIFIED  = 'VERIFIED',
  SUSPENDED = 'SUSPENDED',
  REJECTED  = 'REJECTED',
}

export enum SubscriptionPlan {
  FREE       = 'FREE',
  STARTER    = 'STARTER',
  BUSINESS   = 'BUSINESS',
  ENTERPRISE = 'ENTERPRISE',
}

export enum SubscriptionStatus {
  ACTIVE    = 'ACTIVE',
  PAST_DUE  = 'PAST_DUE',
  CANCELLED = 'CANCELLED',
  TRIALING  = 'TRIALING',
}
