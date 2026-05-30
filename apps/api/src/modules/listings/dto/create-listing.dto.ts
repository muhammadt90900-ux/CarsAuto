// apps/api/src/modules/listings/dto/create-listing.dto.ts
import {
  IsNotEmpty, IsString, IsOptional, IsNumber,
  IsBoolean, IsEnum, IsArray, IsUrl, Min, Max,
  IsInt, Length, ArrayMaxSize, MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  ListingType, ListingCondition, FuelType,
  TransmissionType, DrivetrainType, BodyType,
} from '@prisma/client';

export class CreateListingDto {
  @IsEnum(ListingType)
  type: ListingType;

  @IsNotEmpty()
  @IsString()
  @Length(3, 120)
  titleKu: string;

  @IsOptional() @IsString() @Length(3, 120) titleAr?: string;
  @IsOptional() @IsString() @Length(3, 120) titleEn?: string;
  @IsOptional() @IsString() @Length(3, 120) titleZh?: string;

  // FIX: Max description length added — was unbounded (DoS / oversized payload)
  @IsOptional() @IsString() @MaxLength(5000) descriptionKu?: string;
  @IsOptional() @IsString() @MaxLength(5000) descriptionAr?: string;
  @IsOptional() @IsString() @MaxLength(5000) descriptionEn?: string;
  @IsOptional() @IsString() @MaxLength(5000) descriptionZh?: string;

  @IsNumber()
  @Min(0)
  @Max(100_000_000)   // FIX: Reasonable upper bound on price
  @Type(() => Number)
  price: number;

  @IsOptional() @IsString() @MaxLength(5) currency?: string = 'USD';

  @IsOptional() @IsBoolean() negotiable?: boolean;

  @IsOptional() @IsString() @MaxLength(40) locationId?: string;
  @IsOptional() @IsString() @MaxLength(40) categoryId?: string;
  @IsOptional() @IsString() @MaxLength(40) trimId?: string;
  @IsOptional() @IsString() @MaxLength(40) brandId?: string;
  @IsOptional() @IsString() @MaxLength(40) modelId?: string;

  @IsOptional()
  @IsInt()
  @Min(1900)
  @Max(new Date().getFullYear() + 1)
  @Type(() => Number)
  year?: number;

  @IsOptional() @IsEnum(ListingCondition) condition?: ListingCondition;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(2_000_000)
  @Type(() => Number)
  mileageKm?: number;

  @IsOptional() @IsEnum(FuelType) fuelType?: FuelType;
  @IsOptional() @IsEnum(TransmissionType) transmission?: TransmissionType;
  @IsOptional() @IsEnum(DrivetrainType) drivetrain?: DrivetrainType;
  @IsOptional() @IsEnum(BodyType) bodyType?: BodyType;

  @IsOptional() @IsString() @MaxLength(40) color?: string;
  @IsOptional() @IsString() @MaxLength(40) engineLabel?: string;

  @IsOptional() @IsInt() @Min(0) @Max(20000) @Type(() => Number) engineCC?: number;
  @IsOptional() @IsInt() @Min(0) @Max(2000)  @Type(() => Number) powerKw?: number;
  @IsOptional() @IsInt() @Min(1) @Max(10)    @Type(() => Number) doors?: number;
  @IsOptional() @IsInt() @Min(1) @Max(60)    @Type(() => Number) seats?: number;

  // FIX: VIN max length enforced (standard VIN is 17 chars)
  @IsOptional() @IsString() @MaxLength(17) vin?: string;

  @IsOptional() @IsString() @MaxLength(40) partNumber?: string;

  // FIX: ArrayMaxSize(20) added — was unbounded, allowing thousands of image URLs
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20, { message: 'Maximum 20 images allowed' })
  @IsUrl({ protocols: ['https'], require_tld: true }, { each: true })
  images?: string[];
}
