// apps/api/src/modules/beta/dto/beta-query.dto.ts
import { IsEnum, IsIn, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { BetaRegistrationStatus, ListingType } from '../../../common/prisma/enums';

export class BetaQueryDto {
  @ApiPropertyOptional({ description: 'Free-text search across dealer name, owner name, phone, city, referral ID' })
  @IsOptional() @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Filter by status', enum: BetaRegistrationStatus })
  @IsOptional() @IsEnum(BetaRegistrationStatus)
  status?: BetaRegistrationStatus;

  @ApiPropertyOptional({ description: 'Filter by business type', enum: ListingType })
  @IsOptional() @IsEnum(ListingType)
  businessType?: ListingType;

  @ApiPropertyOptional({ description: 'Sort order', enum: ['newest', 'oldest'] })
  @IsOptional() @IsIn(['newest', 'oldest'])
  sortBy?: 'newest' | 'oldest';

  @ApiPropertyOptional({ description: 'Page number (1-indexed)', minimum: 1, default: 1 })
  @IsOptional() @Type(() => Number) @IsNumber() @Min(1)
  page?: number;

  @ApiPropertyOptional({ description: 'Page size', minimum: 1, maximum: 100, default: 20 })
  @IsOptional() @Type(() => Number) @IsNumber() @Min(1) @Max(100)
  limit?: number;
}
