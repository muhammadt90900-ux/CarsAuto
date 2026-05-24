// apps/api/src/modules/vehicles/dto/vehicle-query.dto.ts
import { IsOptional, IsString, IsNumberString } from 'class-validator';

export class BrandQueryDto {
  @IsOptional()
  @IsString()
  q?: string; // search/filter by name
}

export class ModelQueryDto {
  @IsOptional()
  @IsString()
  q?: string; // search/filter by name

  @IsOptional()
  @IsString()
  brandId?: string; // filter by brand (also set via URL param)
}

export class TrimQueryDto {
  @IsOptional()
  @IsString()
  q?: string; // search/filter by name

  @IsOptional()
  @IsNumberString()
  year?: string; // filter trims available for a given year
}
