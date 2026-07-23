// apps/api/src/modules/sales/dto/create-sale.dto.ts

import {
  IsArray, IsEnum, IsNumber, IsOptional, IsString, IsUUID, Min, ValidateNested, ArrayMinSize, MaxLength, Length,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SaleItemDto } from './sale-item.dto';

export class CreateSaleDto {
  @ApiPropertyOptional({ description: 'Existing Customer record — omit for a walk-in cash sale' })
  @IsOptional()
  @IsUUID()
  customerId?: string;

  @ApiPropertyOptional({ description: 'Links this sale back to the inbound inquiry that produced it' })
  @IsOptional()
  @IsUUID()
  contactRequestId?: string;

  @ApiProperty({ type: [SaleItemDto] })
  @IsArray()
  @ArrayMinSize(1, { message: 'کڕین پێویستە لانیکەم یەک کاڵای تێدابێت / Sale must have at least one item' })
  @ValidateNested({ each: true })
  @Type(() => SaleItemDto)
  items!: SaleItemDto[];

  @ApiPropertyOptional({ minimum: 0, default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  discount?: number;

  @ApiPropertyOptional({ minimum: 0, default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  tax?: number;

  @ApiPropertyOptional({ default: 'USD' })
  @IsOptional()
  @IsString()
  @Length(3, 3)
  currency?: string;

  @ApiPropertyOptional({ maxLength: 50 })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  paymentMethod?: string;

  @ApiPropertyOptional({ maxLength: 2000 })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;

  @ApiPropertyOptional({ description: 'Immediately issue an invoice number for this sale', default: false })
  @IsOptional()
  issueInvoice?: boolean;
}
