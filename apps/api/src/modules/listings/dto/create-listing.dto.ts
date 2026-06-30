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
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ListingType } from '@/common/prisma/enums';

export { ListingType };

// ── Accessory spec DTO ────────────────────────────────────────────────────────
export class AccessorySpecDto {
  // Shared by both ACCESSORY and SERVICE
  @ApiPropertyOptional({ description: 'Compatible vehicle brands', type: [String], example: ['Toyota', 'Hyundai'] })
  @IsOptional() @IsArray() @IsString({ each: true })
  compatibleBrands?: string[];

  @ApiPropertyOptional({ description: 'Compatible vehicle models', type: [String], example: ['Corolla', 'Elantra'] })
  @IsOptional() @IsArray() @IsString({ each: true })
  compatibleModels?: string[];

  // ── Accessory-only fields ──────────────────────────────────────────────────
  @ApiPropertyOptional({ description: 'Accessory brand', example: 'Bosch', maxLength: 100 })
  @IsOptional() @IsString() @MaxLength(100)
  brand?: string;

  @ApiPropertyOptional({ description: 'Accessory model', example: 'X200', maxLength: 100 })
  @IsOptional() @IsString() @MaxLength(100)
  model?: string;

  @ApiPropertyOptional({ description: 'Condition', enum: ['NEW', 'USED'], example: 'NEW' })
  @IsOptional() @IsString() @MaxLength(30)
  condition?: string;

  @ApiPropertyOptional({ description: 'Material', example: 'Leather', maxLength: 100 })
  @IsOptional() @IsString() @MaxLength(100)
  material?: string;

  @ApiPropertyOptional({ description: 'Color', example: 'Black', maxLength: 50 })
  @IsOptional() @IsString() @MaxLength(50)
  color?: string;

  @ApiPropertyOptional({ description: 'Weight in kg', example: 2.5 })
  @IsOptional() @IsNumber()
  @Type(() => Number)
  weight?: number;

  @ApiPropertyOptional({ description: 'Dimensions, e.g. "30x20x15 cm"', example: '30x20x15 cm', maxLength: 100 })
  @IsOptional() @IsString() @MaxLength(100)
  dimensions?: string;

  // ── Service-only fields ────────────────────────────────────────────────────
  @ApiPropertyOptional({
    description: 'Service type',
    enum: ['repair', 'maintenance', 'inspection', 'towing', 'other'],
    example: 'repair',
  })
  @IsOptional() @IsString() @MaxLength(100)
  serviceType?: string;

  @ApiPropertyOptional({ description: 'Estimated service duration in minutes', example: 60, minimum: 1 })
  @IsOptional() @IsInt() @Min(1)
  @Type(() => Number)
  duration?: number;

  @ApiPropertyOptional({ description: 'True if this is a mobile service (provider comes to the customer)', example: false })
  @IsOptional() @IsBoolean()
  mobile?: boolean;

  @ApiPropertyOptional({ description: 'Warranty period in days', example: 30, minimum: 0 })
  @IsOptional() @IsInt() @Min(0)
  @Type(() => Number)
  warranty?: number;

  @ApiPropertyOptional({ description: 'Certifications held by the provider', type: [String] })
  @IsOptional() @IsArray() @IsString({ each: true })
  certifications?: string[];

  @ApiPropertyOptional({ description: 'Days the service is available', type: [String], example: ['mon', 'tue', 'wed', 'thu', 'fri'] })
  @IsOptional() @IsArray() @IsString({ each: true })
  availableDays?: string[];
}

// ── Vehicle spec DTO ─────────────────────────────────────────────────────────
export class VehicleSpecDto {
  @ApiPropertyOptional({ description: 'Vehicle brand', example: 'Toyota', maxLength: 100 })
  @IsOptional() @IsString() @MaxLength(100)
  brand?: string;

  @ApiPropertyOptional({ description: 'Vehicle model', example: 'Corolla', maxLength: 100 })
  @IsOptional() @IsString() @MaxLength(100)
  model?: string;

  @ApiPropertyOptional({ description: 'Model year', example: 2022, minimum: 1900, maximum: 2100 })
  @IsOptional() @IsInt() @Min(1900) @Max(2100)
  @Type(() => Number)
  year?: number;

  @ApiPropertyOptional({ description: 'Mileage in kilometers', example: 45000, minimum: 0 })
  @IsOptional() @IsInt() @Min(0)
  @Type(() => Number)
  mileage?: number;

  @ApiPropertyOptional({ description: 'Color', example: 'White', maxLength: 50 })
  @IsOptional() @IsString() @MaxLength(50)
  color?: string;

  @ApiPropertyOptional({ description: 'Fuel type', example: 'PETROL', maxLength: 30 })
  @IsOptional() @IsString() @MaxLength(30)
  fuelType?: string;

  @ApiPropertyOptional({ description: 'Transmission type', example: 'AUTOMATIC', maxLength: 30 })
  @IsOptional() @IsString() @MaxLength(30)
  transmission?: string;

  @ApiPropertyOptional({ description: 'Engine displacement in cc', example: 1600, minimum: 0 })
  @IsOptional() @IsInt() @Min(0)
  @Type(() => Number)
  engineCC?: number;

  @ApiPropertyOptional({ description: 'Body type', example: 'SEDAN', maxLength: 30 })
  @IsOptional() @IsString() @MaxLength(30)
  bodyType?: string;

  @ApiPropertyOptional({ description: 'Drivetrain type', example: 'FWD', maxLength: 30 })
  @IsOptional() @IsString() @MaxLength(30)
  driveType?: string;

  @ApiPropertyOptional({ description: 'Number of doors', example: 4, minimum: 2, maximum: 6 })
  @IsOptional() @IsInt() @Min(2) @Max(6)
  @Type(() => Number)
  doors?: number;

  @ApiPropertyOptional({ description: 'Motorcycle type (for MOTORCYCLE listings)', example: 'CRUISER', maxLength: 30 })
  @IsOptional() @IsString() @MaxLength(30)
  motoType?: string;

  @ApiPropertyOptional({ description: 'Condition', enum: ['NEW', 'USED'], example: 'USED' })
  @IsOptional() @IsString() @MaxLength(30)
  condition?: string;
}

// ── Spare part spec DTO ───────────────────────────────────────────────────────
export class SparePartSpecDto {
  @ApiPropertyOptional({ description: 'Spare part category', example: 'Brakes', maxLength: 100 })
  @IsOptional() @IsString() @MaxLength(100)
  partCategory?: string;

  @ApiPropertyOptional({ description: 'Manufacturer part number', example: 'OEM-12345', maxLength: 100 })
  @IsOptional() @IsString() @MaxLength(100)
  partNumber?: string;

  @ApiPropertyOptional({ description: 'Condition', enum: ['NEW', 'USED'], example: 'NEW' })
  @IsOptional() @IsString() @MaxLength(30)
  condition?: string;

  @ApiPropertyOptional({ description: 'Compatible vehicle brand', example: 'Toyota', maxLength: 100 })
  @IsOptional() @IsString() @MaxLength(100)
  compatibleBrand?: string;
}

// ── Main create DTO ───────────────────────────────────────────────────────────
export class CreateListingDto {
  @ApiProperty({ description: 'Listing type', enum: ListingType, example: 'CAR' })
  @IsEnum(ListingType)
  type!: ListingType;

  @ApiProperty({ description: 'Title (English)', example: '2022 Toyota Corolla — low mileage', minLength: 1, maxLength: 255 })
  @IsString() @MinLength(1) @MaxLength(255)
  titleEn!: string;

  @ApiProperty({ description: 'Title (Kurdish)', minLength: 1, maxLength: 255 })
  @IsString() @MinLength(1) @MaxLength(255)
  titleKu!: string;

  @ApiProperty({ description: 'Title (Arabic)', minLength: 1, maxLength: 255 })
  @IsString() @MinLength(1) @MaxLength(255)
  titleAr!: string;

  @ApiPropertyOptional({ description: 'Title (Chinese)', minLength: 1, maxLength: 255 })
  @IsOptional() @IsString() @MinLength(1) @MaxLength(255)
  titleZh?: string;

  @ApiProperty({ description: 'Price (in `currency`)', example: 18500, minimum: 0 })
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  price!: number;

  @ApiProperty({ description: 'ISO currency code', example: 'USD' })
  @IsString()
  currency!: string;

  @ApiPropertyOptional({ description: 'Description (English)', maxLength: 5000 })
  @IsOptional() @IsString() @MaxLength(5000)
  descriptionEn?: string;

  @ApiPropertyOptional({ description: 'Description (Kurdish)', maxLength: 5000 })
  @IsOptional() @IsString() @MaxLength(5000)
  descriptionKu?: string;

  @ApiPropertyOptional({ description: 'Description (Arabic)', maxLength: 5000 })
  @IsOptional() @IsString() @MaxLength(5000)
  descriptionAr?: string;

  /** For CAR / MOTORCYCLE / SPARE_PART — stored on ListingVehicleSpec */
  @ApiPropertyOptional({ description: 'Condition (top-level, for CAR/MOTORCYCLE/SPARE_PART listings)', enum: ['NEW', 'USED'] })
  @IsOptional() @IsString()
  condition?: string;

  @ApiPropertyOptional({ description: 'Category id', format: 'uuid' })
  @IsOptional() @IsUUID()
  categoryId?: string;

  @ApiPropertyOptional({ description: 'Location id', format: 'uuid' })
  @IsOptional() @IsUUID()
  locationId?: string;

  @ApiPropertyOptional({ description: 'Image URLs (Cloudinary)', type: [String] })
  @IsOptional() @IsArray() @IsString({ each: true })
  images?: string[];

  @ApiPropertyOptional({ description: 'Whether the price is negotiable', example: true })
  @IsOptional() @IsBoolean()
  negotiable?: boolean;

  /** For ACCESSORY / SERVICE — stored on ListingAccessorySpec */
  @ApiPropertyOptional({ description: 'Accessory/service-specific fields (ACCESSORY or SERVICE listings)', type: () => AccessorySpecDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => AccessorySpecDto)
  accessorySpec?: AccessorySpecDto;

  /** For CAR / MOTORCYCLE — vehicle details */
  @ApiPropertyOptional({ description: 'Vehicle-specific fields (CAR or MOTORCYCLE listings)', type: () => VehicleSpecDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => VehicleSpecDto)
  vehicleSpec?: VehicleSpecDto;

  /** For SPARE_PART */
  @ApiPropertyOptional({ description: 'Spare-part-specific fields (SPARE_PART listings)', type: () => SparePartSpecDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => SparePartSpecDto)
  sparePartSpec?: SparePartSpecDto;

  /** Location fields */
  @ApiPropertyOptional({ description: 'City', example: 'Erbil', maxLength: 100 })
  @IsOptional() @IsString() @MaxLength(100)
  city?: string;

  @ApiPropertyOptional({ description: 'District/neighbourhood', maxLength: 100 })
  @IsOptional() @IsString() @MaxLength(100)
  district?: string;

  /** Contact fields */
  @ApiPropertyOptional({ description: 'Contact phone number', example: '+9647501234567', maxLength: 30 })
  @IsOptional() @IsString() @MaxLength(30)
  contactPhone?: string;

  @ApiPropertyOptional({ description: 'Contact WhatsApp number', example: '+9647501234567', maxLength: 30 })
  @IsOptional() @IsString() @MaxLength(30)
  contactWhatsapp?: string;
}
