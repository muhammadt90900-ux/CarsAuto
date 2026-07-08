// apps/api/src/modules/listings/dto/mark-sold.dto.ts
//
// Prompt 7 — deliberately its own tiny DTO rather than widening
// CreateListingDto with a `status` field — see markSold()'s comment in
// listings.service.ts for why.

import { IsNumber, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class MarkSoldDto {
  @ApiProperty({ description: 'Final agreed sale price', example: 18500 })
  @IsNumber()
  @Min(0.01)
  soldPrice!: number;
}
