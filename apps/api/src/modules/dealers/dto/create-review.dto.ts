// apps/api/src/modules/dealers/dto/create-review.dto.ts

import { IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';

export class CreateReviewDto {
  @IsInt() @Min(1) @Max(5)
  rating: number;

  @IsOptional() @IsString() @MaxLength(120)
  title?: string;

  @IsString() @MinLength(10) @MaxLength(1000)
  body: string;

  @IsOptional() @IsInt() @Min(1) @Max(5)
  ratingService?: number;

  @IsOptional() @IsInt() @Min(1) @Max(5)
  ratingPrice?: number;

  @IsOptional() @IsInt() @Min(1) @Max(5)
  ratingQuality?: number;
}
