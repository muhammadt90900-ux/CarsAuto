// apps/api/src/modules/search/dto/advanced-search.dto.ts

import { IsOptional, IsString, IsNumber, MaxLength, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class AdvancedSearchDto {
  @IsOptional() @IsString() @MaxLength(100)
  q?: string;

  @IsOptional() @IsString() @MaxLength(40)
  type?: string;

  @IsOptional() @IsString() @MaxLength(40)
  condition?: string;

  @IsOptional() @IsString() @MaxLength(80)
  locationId?: string;

  @IsOptional() @IsNumber() @Min(0) @Type(() => Number)
  minPrice?: number;

  @IsOptional() @IsNumber() @Min(0) @Type(() => Number)
  maxPrice?: number;

  @IsOptional() @IsNumber() @Min(0) @Type(() => Number)
  minYear?: number;

  @IsOptional() @IsNumber() @Min(0) @Type(() => Number)
  maxYear?: number;

  @IsOptional() @IsNumber() @Min(1) @Type(() => Number)
  page?: number;

  @IsOptional() @IsNumber() @Min(1) @Max(100) @Type(() => Number)
  limit?: number;
}
