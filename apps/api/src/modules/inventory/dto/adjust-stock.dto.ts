// apps/api/src/modules/inventory/dto/adjust-stock.dto.ts

import { IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { InventoryMovementType } from '../../../common/prisma/enums';

export class AdjustStockDto {
  @ApiProperty({ enum: InventoryMovementType })
  @IsEnum(InventoryMovementType, { message: 'جۆری گۆڕانکاری نادروستە / Invalid movement type' })
  type!: InventoryMovementType;

  @ApiProperty({
    description: 'Signed change to apply to quantity. Positive for RESTOCK/RETURN, negative for SALE/ADJUSTMENT-down.',
  })
  @IsInt()
  @IsNotEmpty()
  change!: number;

  @ApiPropertyOptional({ maxLength: 255 })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  reason?: string;
}
