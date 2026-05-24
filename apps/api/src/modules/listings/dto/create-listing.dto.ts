// apps/api/src/modules/listings/dto/create-listing.dto.ts
import {
  IsNotEmpty, IsString, IsOptional, IsNumber,
  IsBoolean, IsEnum, IsArray,
} from 'class-validator';
import { ListingType, ListingCondition, Currency } from '@auto-bazaar-pro/types';

export class CreateListingDto {
  @IsEnum(ListingType)
  type: ListingType;

  @IsNotEmpty() @IsString() titleKu: string;
  @IsNotEmpty() @IsString() titleAr: string;
  @IsNotEmpty() @IsString() titleEn: string;
  @IsNotEmpty() @IsString() titleZh: string;

  @IsOptional() @IsString() descriptionKu?: string;
  @IsOptional() @IsString() descriptionAr?: string;
  @IsOptional() @IsString() descriptionEn?: string;
  @IsOptional() @IsString() descriptionZh?: string;

  @IsNumber()  price: number;
  @IsEnum(Currency) currency: Currency;
  @IsBoolean() @IsOptional() negotiable?: boolean;
  @IsString()  @IsOptional() locationId?: string;

  // ── Car identity ──────────────────────────────────────────────────────────
  @IsString()  @IsOptional() makeId?: string;
  @IsString()  @IsOptional() modelId?: string;
  @IsNumber()  @IsOptional() year?: number;
  @IsString()  @IsOptional() trim?: string;          // "LX" | "Sport" | "AMG Line" …

  // ── Car specs ─────────────────────────────────────────────────────────────
  @IsString()  @IsOptional() bodyType?: string;      // Sedan | SUV | Hatchback | Pickup Truck …
  @IsString()  @IsOptional() fuelType?: string;      // Gasoline | Diesel | Hybrid | Electric | LPG …
  @IsString()  @IsOptional() transmission?: string;  // Automatic | Manual | CVT | DCT …
  @IsString()  @IsOptional() driveType?: string;     // FWD | RWD | AWD | 4WD | Part-time 4WD
  @IsEnum(ListingCondition) @IsOptional() condition?: ListingCondition;
  @IsNumber()  @IsOptional() mileage?: number;
  @IsString()  @IsOptional() color?: string;
  @IsNumber()  @IsOptional() engineSize?: number;    // litres e.g. 2.0
  @IsNumber()  @IsOptional() doors?: number;
  @IsNumber()  @IsOptional() seats?: number;
  @IsArray()   @IsOptional() features?: string[];    // ["Sunroof", "Leather Seats", …]

  // ── Motorcycle extra ──────────────────────────────────────────────────────
  @IsNumber()  @IsOptional() engineCC?: number;

  // ── Spare-part fields ─────────────────────────────────────────────────────
  @IsString()  @IsOptional() categoryId?: string;
  @IsString()  @IsOptional() partNumber?: string;
  @IsArray()   @IsOptional() compatibleMakes?: string[];
  @IsArray()   @IsOptional() compatibleModels?: string[];
  @IsNumber()  @IsOptional() compatibleYearsFrom?: number;
  @IsNumber()  @IsOptional() compatibleYearsTo?: number;
  @IsNumber()  @IsOptional() quantity?: number;

  @IsArray()   @IsOptional() images?: string[];
}
