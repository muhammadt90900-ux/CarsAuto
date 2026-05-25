// apps/api/src/modules/listings/dto/create-listing.dto.ts
import {
  IsNotEmpty, IsString, IsOptional, IsNumber,
  IsBoolean, IsEnum, IsArray, IsUrl, Min, Max,
  IsInt, Length,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  ListingType, ListingCondition, FuelType,
  TransmissionType, DrivetrainType, BodyType,
} from '@prisma/client';

export class CreateListingDto {
  // ── Listing type ────────────────────────────────────────────────
  @IsEnum(ListingType)
  type: ListingType;

  // ── Localised titles (at least Kurdish required) ────────────────
  @IsNotEmpty()
  @IsString()
  @Length(3, 120)
  titleKu: string;

  @IsOptional()
  @IsString()
  @Length(3, 120)
  titleAr?: string;

  @IsOptional()
  @IsString()
  @Length(3, 120)
  titleEn?: string;

  @IsOptional()
  @IsString()
  @Length(3, 120)
  titleZh?: string;

  // ── Localised descriptions ──────────────────────────────────────
  @IsOptional()
  @IsString()
  descriptionKu?: string;

  @IsOptional()
  @IsString()
  descriptionAr?: string;

  @IsOptional()
  @IsString()
  descriptionEn?: string;

  @IsOptional()
  @IsString()
  descriptionZh?: string;

  // ── Pricing ─────────────────────────────────────────────────────
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  price: number;

  @IsOptional()
  @IsString()
  currency?: string = 'USD';

  @IsOptional()
  @IsBoolean()
  negotiable?: boolean;

  // ── Location & category ─────────────────────────────────────────
  @IsOptional()
  @IsString()
  locationId?: string;

  @IsOptional()
  @IsString()
  categoryId?: string;

  // ── Vehicle spec fields ─────────────────────────────────────────

  // Structured path (preferred)
  @IsOptional()
  @IsString()
  trimId?: string;

  // Denormalized overrides / free-text path
  @IsOptional()
  @IsString()
  brandId?: string;

  @IsOptional()
  @IsString()
  modelId?: string;

  @IsOptional()
  @IsInt()
  @Min(1900)
  @Max(new Date().getFullYear() + 1)
  @Type(() => Number)
  year?: number;

  @IsOptional()
  @IsEnum(ListingCondition)
  condition?: ListingCondition;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  mileageKm?: number;

  @IsOptional()
  @IsEnum(FuelType)
  fuelType?: FuelType;

  @IsOptional()
  @IsEnum(TransmissionType)
  transmission?: TransmissionType;

  @IsOptional()
  @IsEnum(DrivetrainType)
  drivetrain?: DrivetrainType;

  @IsOptional()
  @IsEnum(BodyType)
  bodyType?: BodyType;

  @IsOptional()
  @IsString()
  color?: string;

  @IsOptional()
  @IsString()
  engineLabel?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  engineCC?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  powerKw?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10)
  @Type(() => Number)
  doors?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(60)
  @Type(() => Number)
  seats?: number;

  @IsOptional()
  @IsString()
  vin?: string;

  // ── Spare part only ─────────────────────────────────────────────
  @IsOptional()
  @IsString()
  partNumber?: string;

  // ── Images (array of URLs) ──────────────────────────────────────
  @IsOptional()
  @IsArray()
  @IsUrl({}, { each: true })
  images?: string[];
}
