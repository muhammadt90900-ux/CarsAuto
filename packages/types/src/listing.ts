// packages/types/src/listing.ts
export enum ListingType {
  CAR = 'CAR',
  MOTORCYCLE = 'MOTORCYCLE',
  SPARE_PART = 'SPARE_PART',
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
