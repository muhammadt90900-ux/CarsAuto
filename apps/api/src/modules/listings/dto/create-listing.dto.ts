import {
  IsString,
  IsNumber,
  IsOptional,
  IsArray,
  IsEnum,
  IsUUID,
  IsBoolean,
  IsInt,
  Min,
  Max,
  MinLength,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ListingType } from '@/common/prisma/enums';

export { ListingType };

// ── Accessory spec DTO ────────────────────────────────────────────────────────
export class AccessorySpecDto {
  // Shared by both ACCESSORY and SERVICE
  @IsOptional() @IsArray() @IsString({ each: true })
  compatibleBrands?: string[];

  @IsOptional() @IsArray() @IsString({ each: true })
  compatibleModels?: string[];

  // ── Accessory-only fields ──────────────────────────────────────────────────
  @IsOptional() @IsString() @MaxLength(100)
  brand?: string;

  @IsOptional() @IsString() @MaxLength(100)
  model?: string;

  /** "NEW" | "USED" */
  @IsOptional() @IsString() @MaxLength(30)
  condition?: string;

  @IsOptional() @IsString() @MaxLength(100)
  material?: string;

  @IsOptional() @IsString() @MaxLength(50)
  color?: string;

  @IsOptional() @IsNumber()
  @Type(() => Number)
  weight?: number;

  /** e.g. "30x20x15 cm" */
  @IsOptional() @IsString() @MaxLength(100)
  dimensions?: string;

  // ── Service-only fields ────────────────────────────────────────────────────
  /** "repair" | "maintenance" | "inspection" | "towing" | "other" */
  @IsOptional() @IsString() @MaxLength(100)
  serviceType?: string;

  /** Estimated service duration in minutes */
  @IsOptional() @IsInt() @Min(1)
  @Type(() => Number)
  duration?: number;

  /** True = mobile service (provider comes to customer) */
  @IsOptional() @IsBoolean()
  mobile?: boolean;

  /** Warranty in days */
  @IsOptional() @IsInt() @Min(0)
  @Type(() => Number)
  warranty?: number;

  @IsOptional() @IsArray() @IsString({ each: true })
  certifications?: string[];

  /** e.g. ["mon","tue","wed","thu","fri"] */
  @IsOptional() @IsArray() @IsString({ each: true })
  availableDays?: string[];
}

// ── Vehicle spec DTO ─────────────────────────────────────────────────────────
export class VehicleSpecDto {
  @IsOptional() @IsString() @MaxLength(100)
  brand?: string;

  @IsOptional() @IsString() @MaxLength(100)
  model?: string;

  @IsOptional() @IsInt() @Min(1900) @Max(2100)
  @Type(() => Number)
  year?: number;

  @IsOptional() @IsInt() @Min(0)
  @Type(() => Number)
  mileage?: number;

  @IsOptional() @IsString() @MaxLength(50)
  color?: string;

  @IsOptional() @IsString() @MaxLength(30)
  fuelType?: string;

  @IsOptional() @IsString() @MaxLength(30)
  transmission?: string;

  @IsOptional() @IsInt() @Min(0)
  @Type(() => Number)
  engineCC?: number;

  @IsOptional() @IsString() @MaxLength(30)
  bodyType?: string;

  @IsOptional() @IsString() @MaxLength(30)
  driveType?: string;

  @IsOptional() @IsInt() @Min(2) @Max(6)
  @Type(() => Number)
  doors?: number;

  @IsOptional() @IsString() @MaxLength(30)
  motoType?: string;

  @IsOptional() @IsString() @MaxLength(30)
  condition?: string;
}

// ── Spare part spec DTO ───────────────────────────────────────────────────────
export class SparePartSpecDto {
  @IsOptional() @IsString() @MaxLength(100)
  partCategory?: string;

  @IsOptional() @IsString() @MaxLength(100)
  partNumber?: string;

  @IsOptional() @IsString() @MaxLength(30)
  condition?: string;

  @IsOptional() @IsString() @MaxLength(100)
  compatibleBrand?: string;
}

// ── Main create DTO ───────────────────────────────────────────────────────────
export class CreateListingDto {
  @IsEnum(ListingType)
  type!: ListingType;

  @IsString() @MinLength(1) @MaxLength(255)
  titleEn!: string;

  @IsString() @MinLength(1) @MaxLength(255)
  titleKu!: string;

  @IsString() @MinLength(1) @MaxLength(255)
  titleAr!: string;

  @IsOptional() @IsString() @MinLength(1) @MaxLength(255)
  titleZh?: string;

  @IsNumber()
  @Type(() => Number)
  @Min(0)
  price!: number;

  @IsString()
  currency!: string;

  @IsOptional() @IsString() @MaxLength(5000)
  descriptionEn?: string;

  @IsOptional() @IsString() @MaxLength(5000)
  descriptionKu?: string;

  @IsOptional() @IsString() @MaxLength(5000)
  descriptionAr?: string;

  /** For CAR / MOTORCYCLE / SPARE_PART — stored on ListingVehicleSpec */
  @IsOptional() @IsString()
  condition?: string;

  @IsOptional() @IsUUID()
  categoryId?: string;

  @IsOptional() @IsUUID()
  locationId?: string;

  @IsOptional() @IsArray() @IsString({ each: true })
  images?: string[];

  @IsOptional() @IsBoolean()
  negotiable?: boolean;

  /** For ACCESSORY / SERVICE — stored on ListingAccessorySpec */
  @IsOptional()
  @ValidateNested()
  @Type(() => AccessorySpecDto)
  accessorySpec?: AccessorySpecDto;

  /** For CAR / MOTORCYCLE — vehicle details */
  @IsOptional()
  @ValidateNested()
  @Type(() => VehicleSpecDto)
  vehicleSpec?: VehicleSpecDto;

  /** For SPARE_PART */
  @IsOptional()
  @ValidateNested()
  @Type(() => SparePartSpecDto)
  sparePartSpec?: SparePartSpecDto;

  /** Location fields */
  @IsOptional() @IsString() @MaxLength(100)
  city?: string;

  @IsOptional() @IsString() @MaxLength(100)
  district?: string;

  /** Contact fields */
  @IsOptional() @IsString() @MaxLength(30)
  contactPhone?: string;

  @IsOptional() @IsString() @MaxLength(30)
  contactWhatsapp?: string;
}
