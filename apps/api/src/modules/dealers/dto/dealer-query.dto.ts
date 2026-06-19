import { IsEnum, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { DealerTier } from '@/common/prisma/enums';

export class DealerQueryDto {
  @IsOptional() @IsString()
  search?: string;

  @IsOptional() @IsString()
  city?: string;

  @IsOptional() @IsEnum(DealerTier)
  tier?: DealerTier;

  @IsOptional() @Type(() => Number) @IsNumber() @Min(1) @Max(5)
  minRating?: number;

  @IsOptional() @IsString()
  sortBy?: 'rating' | 'listings' | 'reviews' | 'newest' | 'followers';

  @IsOptional() @Type(() => Number) @IsNumber() @Min(1)
  page?: number;

  @IsOptional() @Type(() => Number) @IsNumber() @Min(1) @Max(100)
  limit?: number;
}
