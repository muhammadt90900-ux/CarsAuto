import { IsString, IsNumber, IsOptional, IsArray, IsEnum, IsUUID, Min, MinLength } from 'class-validator';
import { Type } from 'class-transformer';
// BUG FIX: Import ListingType from the Prisma-generated client via the shared
// re-export in enums.ts. The previous locally-defined enum had completely
// different values (TRUCK, BUS, PART, OTHER) vs what the database schema
// actually contains (CAR, MOTORCYCLE, SPARE_PART). This caused @IsEnum() to
// reject every SPARE_PART submission with a silent 400, and any value that
// slipped through to Prisma caused a database constraint violation.
import { ListingType } from '@prisma/client';

// Re-export so any import of ListingType from this module still resolves.
export { ListingType };

export class CreateListingDto {
  @IsEnum(ListingType)
  type!: ListingType;

  @IsString()
  @MinLength(1)
  titleEn!: string;

  @IsString()
  @MinLength(1)
  titleKu!: string;

  @IsString()
  @MinLength(1)
  titleAr!: string;

  // BUG FIX: titleZh is a required non-nullable column in the Prisma schema
  // (String @db.VarChar(255)). It was missing from this DTO entirely, so
  // ValidationPipe's `whitelist: true` was silently stripping it from every
  // request before it reached the service. Prisma then threw a NOT NULL
  // constraint violation (P2002/23502) and the listing was never saved.
  @IsString()
  @MinLength(1)
  titleZh!: string;

  @IsNumber()
  @Type(() => Number)
  @Min(0)
  price!: number;

  @IsString()
  currency!: string;

  @IsOptional()
  @IsString()
  descriptionEn?: string;

  @IsOptional()
  @IsString()
  descriptionKu?: string;

  @IsOptional()
  @IsString()
  descriptionAr?: string;

  @IsOptional()
  @IsString()
  condition?: string;

  @IsOptional()
  @IsUUID()
  categoryId?: string;

  // vehicleSpecId removed: Listing has no vehicleSpecId FK column.
  // The relation is inverse (ListingVehicleSpec.listingId → Listing).
  // Passing it to prisma.listing.create() causes PrismaClientValidationError:
  // "Unknown arg `vehicleSpecId`". The service handles vehicleSpec via nested create.

  @IsOptional()
  @IsUUID()
  locationId?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[];

  @IsOptional()
  negotiable?: boolean;
}
