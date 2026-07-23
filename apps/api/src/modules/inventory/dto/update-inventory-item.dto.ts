// apps/api/src/modules/inventory/dto/update-inventory-item.dto.ts
//
// Deliberately excludes `quantity` — stock levels change only through
// AdjustStockDto (POST /inventory/:id/adjust), which writes an
// InventoryMovement audit row alongside the change. Allowing a silent
// PATCH of quantity here would let stock drift with no trail of why.

import {
  IsEnum, IsString, IsOptional, IsInt, Min, MaxLength, IsNumber, Length,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { ListingType, InventoryItemStatus } from '../../../common/prisma/enums';

export class UpdateInventoryItemDto {
  @ApiPropertyOptional({ enum: ListingType })
  @IsOptional()
  @IsEnum(ListingType)
  type?: ListingType;

  @ApiPropertyOptional({ maxLength: 255 })
  @IsOptional()
  @IsString()
  @Length(2, 255, { message: 'ناوی کاڵا پێویستە لە نێوان ٢ و ٢٥٥ پیت بێت / Item name must be between 2 and 255 characters' })
  name?: string;

  @ApiPropertyOptional({ maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  sku?: string;

  @ApiPropertyOptional({ minimum: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  reorderThreshold?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0, { message: 'نرخ ناتوانێت لە سفر کەمتر بێت / Cost price cannot be negative' })
  costPrice?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(3, 3)
  currency?: string;

  @ApiPropertyOptional({ enum: InventoryItemStatus })
  @IsOptional()
  @IsEnum(InventoryItemStatus)
  status?: InventoryItemStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}
