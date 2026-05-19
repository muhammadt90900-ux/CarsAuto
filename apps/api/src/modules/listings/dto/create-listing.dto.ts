// apps/api/src/modules/listings/dto/create-listing.dto.ts
import { IsNotEmpty, IsString, IsOptional, IsNumber, IsBoolean, IsEnum, IsArray } from 'class-validator';
import { ListingType, ListingCondition, Currency } from '@auto-bazaar-pro/types';

export class CreateListingDto {
  @IsEnum(ListingType)
  type: ListingType;

  @IsNotEmpty()
  @IsString()
  titleKu: string;
  titleAr: string;
  titleEn: string;
  titleZh: string;

  @IsOptional()
  @IsString()
  descriptionKu?: string;
  descriptionAr?: string;
  descriptionEn?: string;
  descriptionZh?: string;

  @IsNumber()
  price: number;

  @IsEnum(Currency)
  currency: Currency;

  @IsBoolean()
  @IsOptional()
  negotiable?: boolean;

  @IsString()
  @IsOptional()
  locationId?: string;

  // Car fields
  @IsString()
  @IsOptional()
  makeId?: string;
  @IsString()
  @IsOptional()
  modelId?: string;
  @IsNumber()
  @IsOptional()
  year?: number;
  @IsEnum(ListingCondition)
  @IsOptional()
  condition?: ListingCondition;
  @IsNumber()
  @IsOptional()
  mileage?: number;
  // ... other optional fields

  @IsArray()
  @IsOptional()
  images?: string[];
}
