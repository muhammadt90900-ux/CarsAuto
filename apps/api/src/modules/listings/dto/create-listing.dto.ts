import { IsString, IsNumber, IsOptional, IsArray, IsEnum, IsUUID, Min, MinLength } from 'class-validator';
import { Type } from 'class-transformer';

export enum ListingType {
  CAR = 'CAR',
  TRUCK = 'TRUCK',
  MOTORCYCLE = 'MOTORCYCLE',
  BUS = 'BUS',
  PART       = 'PART',
  OTHER = 'OTHER',
}

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

  @IsOptional()
  @IsUUID()
  vehicleSpecId?: string;

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
