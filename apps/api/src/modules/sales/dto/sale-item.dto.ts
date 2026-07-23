// apps/api/src/modules/sales/dto/sale-item.dto.ts

import { IsInt, IsNumber, IsOptional, IsString, IsUUID, Min, MaxLength } from 'class-validator';
import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';

export class SaleItemDto {
  @ApiPropertyOptional({ description: 'Links this line to an InventoryItem — omit for a one-off item not tracked in inventory' })
  @IsOptional()
  @IsUUID()
  inventoryItemId?: string;

  @ApiProperty({ maxLength: 255 })
  @IsString()
  @MaxLength(255)
  description!: string;

  @ApiProperty({ minimum: 1 })
  @IsInt()
  @Min(1, { message: 'بڕ پێویستە لانیکەم یەک بێت / Quantity must be at least 1' })
  quantity!: number;

  @ApiProperty({ minimum: 0 })
  @IsNumber()
  @Min(0)
  unitPrice!: number;
}
