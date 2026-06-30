import { IsEnum, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { DealerTier } from '@/common/prisma/enums';

export class DealerQueryDto {
  @ApiPropertyOptional({ description: 'Free-text search across dealer name/tagline' })
  @IsOptional() @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Filter by city' })
  @IsOptional() @IsString()
  city?: string;

  @ApiPropertyOptional({ description: 'Filter by dealer tier', enum: DealerTier })
  @IsOptional() @IsEnum(DealerTier)
  tier?: DealerTier;

  @ApiPropertyOptional({ description: 'Minimum average rating', minimum: 1, maximum: 5 })
  @IsOptional() @Type(() => Number) @IsNumber() @Min(1) @Max(5)
  minRating?: number;

  @ApiPropertyOptional({ description: 'Sort order', enum: ['rating', 'listings', 'reviews', 'newest', 'followers'] })
  @IsOptional() @IsString()
  sortBy?: 'rating' | 'listings' | 'reviews' | 'newest' | 'followers';

  @ApiPropertyOptional({ description: 'Page number (1-indexed)', minimum: 1, default: 1 })
  @IsOptional() @Type(() => Number) @IsNumber() @Min(1)
  page?: number;

  @ApiPropertyOptional({ description: 'Page size', minimum: 1, maximum: 100, default: 20 })
  @IsOptional() @Type(() => Number) @IsNumber() @Min(1) @Max(100)
  limit?: number;
}
