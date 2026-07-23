// apps/api/src/modules/inventory/dto/create-inventory-item.dto.ts

import {
  IsEnum, IsString, IsOptional, IsInt, Min, MaxLength, IsNumber, IsUUID, Length,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ListingType } from '../../../common/prisma/enums';

export class CreateInventoryItemDto {
  @ApiProperty({ enum: ListingType })
  @IsEnum(ListingType, { message: 'جۆری کاڵا نادروستە / Invalid item type' })
  type!: ListingType;

  @ApiProperty({ maxLength: 255 })
  @IsString()
  @Length(2, 255, { message: 'ناوی کاڵا پێویستە لە نێوان ٢ و ٢٥٥ پیت بێت / Item name must be between 2 and 255 characters' })
  name!: string;

  @ApiPropertyOptional({ maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  sku?: string;

  @ApiProperty({ minimum: 0, description: 'Starting quantity in stock' })
  @IsInt()
  @Min(0, { message: 'بڕ ناتوانێت لە سفر کەمتر بێت / Quantity cannot be negative' })
  quantity!: number;

  @ApiPropertyOptional({ minimum: 0, default: 1, description: 'Alert threshold — item flips to LOW_STOCK at or below this' })
  @IsOptional()
  @IsInt()
  @Min(0)
  reorderThreshold?: number;

  @ApiPropertyOptional({ description: 'Dealer\'s purchase/cost price per unit' })
  @IsOptional()
  @IsNumber()
  @Min(0, { message: 'نرخ ناتوانێت لە سفر کەمتر بێت / Cost price cannot be negative' })
  costPrice?: number;

  @ApiPropertyOptional({ default: 'USD' })
  @IsOptional()
  @IsString()
  @Length(3, 3)
  currency?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;

  @ApiPropertyOptional({ description: 'Link to an already-published marketplace listing' })
  @IsOptional()
  @IsUUID()
  listingId?: string;
}
