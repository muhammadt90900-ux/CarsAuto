// packages/types/src/listing.ts
import { User } from './user';

export enum ListingType {
  CAR = 'CAR',
  MOTORCYCLE = 'MOTORCYCLE',
  SPARE_PART = 'SPARE_PART',
  ACCESSORY = 'ACCESSORY',
  SERVICE = 'SERVICE',
}

export enum ListingCondition {
  NEW = 'NEW',
  USED = 'USED',
  SALVAGE = 'SALVAGE',
}

export enum Currency {
  IQD = 'IQD',
  USD = 'USD',
  AED = 'AED',
  CNY = 'CNY',
  EUR = 'EUR',
}

export enum ListingStatus {
  ACTIVE = 'ACTIVE',
  SOLD = 'SOLD',
  DRAFT = 'DRAFT',
  EXPIRED = 'EXPIRED',
  PENDING = 'PENDING',
  REJECTED = 'REJECTED',
}

export interface MultiLangContent {
  ku: string;
  ar: string;
  en: string;
  zh: string;
}

export interface ListingBase {
  id: string;
  title: MultiLangContent;
  description: MultiLangContent;
  price: number;
  currency: Currency;
  negotiable: boolean;
  locationId: string;
  userId: string;
  status: ListingStatus;
  views: number;
  featured: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CarListing extends ListingBase {
  type: ListingType.CAR;
  makeId: string;
  modelId: string;
  year: number;
  bodyType: string;
  condition: ListingCondition;
  mileage: number;
  color: string;
  fuelType: string;
  transmission: string;
  engineSize: number;
  driveType: string;
  doors: number;
  seats: number;
  features: string[];
}

export interface MotorcycleListing extends ListingBase {
  type: ListingType.MOTORCYCLE;
  makeId: string;
  modelId: string;
  year: number;
  engineCC: number;
  condition: ListingCondition;
  mileage: number;
  color: string;
}

export interface SparePartListing extends ListingBase {
  type: ListingType.SPARE_PART;
  categoryId: string;
  partNumber: string;
  compatibleMakes: string[];
  compatibleModels: string[];
  compatibleYears: { from: number; to: number };
  condition: ListingCondition;
  quantity: number;
}

/**
 * Feature 3 — matches `ListingAccessorySpec` (prisma/schema.prisma) and the
 * fields submitted by the sell form (useSellForm.ts: accBrand, accModel,
 * accCondition, accColor, accMaterial, accWeight, accDimensions —
 * un-prefixed here to line up with the other Listing variants).
 */
export interface AccessoryListing extends ListingBase {
  type: ListingType.ACCESSORY;
  categoryId: string;
  brand?: string;
  model?: string;
  condition?: ListingCondition;
  color?: string;
  material?: string;
  weight?: number;
  dimensions?: string;
  compatibleBrands: string[];
  compatibleModels: string[];
}

/**
 * Feature 3 — matches `ListingAccessorySpec` (prisma/schema.prisma) and the
 * fields submitted by the sell form (useSellForm.ts: serviceType, duration,
 * mobile, warranty, availableDays).
 */
export interface ServiceListing extends ListingBase {
  type: ListingType.SERVICE;
  categoryId: string;
  serviceType?: string;
  duration?: number;
  mobile: boolean;
  warranty?: number;
  certifications: string[];
  availableDays: string[];
  compatibleBrands: string[];
  compatibleModels: string[];
}

// ─── API response shapes ───────────────────────────────────────────────────

/** Any concrete listing — cars, motorcycles, spare parts, accessories, and services. */
export type Listing =
  | CarListing
  | MotorcycleListing
  | SparePartListing
  | AccessoryListing
  | ServiceListing;

export interface ListingImage {
  id: string;
  url: string;
  order: number;
  /** Feature: 360° Photo Set — 'standard' | '360_view' */
  tag?: string;
}

/** Minimal seller/poster info attached to a single-listing detail response. */
export type ListingUser = Pick<User, 'id' | 'name' | 'avatar' | 'phone' | 'verified'>;

/** GET /listings/:id — full listing with images and poster details. */
export type ListingDetailResponse = Listing & {
  images: ListingImage[];
  user: ListingUser;
};

/** GET /listings with `cursor` present — cursor-paginated page. */
export interface ListingListResponseCursor {
  data: Listing[];
  nextCursor: string | null;
  hasMore: boolean;
  total: number;
}

/** GET /listings with `page` (no `cursor`) — offset-paginated page. */
export interface ListingListResponsePaged {
  data: Listing[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/** Response shape depends on whether the request used `cursor` or `page`. */
export type ListingListResponse = ListingListResponseCursor | ListingListResponsePaged;

/** GET /search — a listing plus its relevance score. */
export type SearchResult = Listing & { score?: number };

export interface SearchResponse {
  data: SearchResult[];
  total: number;
}
