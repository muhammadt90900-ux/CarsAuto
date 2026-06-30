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

// F-MED fix: mirrors for the 5 enums added to schema.prisma — Payment.status,
// Payment.gateway, Report.status, Chat.status, DealerContactRequest.status.
// These replace plain-String columns that previously had no DB-level
// constraint. Note the values are UPPERCASE, matching every other enum in
// this file — the OLD string columns stored lowercase values
// ('pending', 'active', 'stripe', ...); see
// apps/api/prisma/migrations-manual/2026-06-status-enums.sql for the
// one-time data migration this requires.

export enum PaymentStatus {
  PENDING   = 'PENDING',
  COMPLETED = 'COMPLETED',
  FAILED    = 'FAILED',
  REFUNDED  = 'REFUNDED',
  CANCELLED = 'CANCELLED',
}

export enum PaymentGateway {
  STRIPE     = 'STRIPE',
  ZAINCASH   = 'ZAINCASH',
  FASTPAY    = 'FASTPAY',
  QICARD     = 'QICARD',
  ASIAHAWALA = 'ASIAHAWALA',
  ALIPAY     = 'ALIPAY',
  WECHATPAY  = 'WECHATPAY',
}

export enum ReportStatus {
  PENDING   = 'PENDING',
  REVIEWING = 'REVIEWING',
  RESOLVED  = 'RESOLVED',
  DISMISSED = 'DISMISSED',
}

export enum ChatStatus {
  ACTIVE   = 'ACTIVE',
  ARCHIVED = 'ARCHIVED',
  BLOCKED  = 'BLOCKED',
}

export enum ContactRequestStatus {
  NEW      = 'NEW',
  READ     = 'READ',
  REPLIED  = 'REPLIED',
  ARCHIVED = 'ARCHIVED',
}
