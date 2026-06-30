// apps/api/src/modules/dealers/dto/create-review.dto.ts

import { IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateReviewDto {
  @ApiProperty({ description: 'Overall rating (1-5)', example: 5, minimum: 1, maximum: 5 })
  @IsInt() @Min(1) @Max(5)
  rating!: number;

  @ApiPropertyOptional({ description: 'Review title', maxLength: 120 })
  @IsOptional() @IsString() @MaxLength(120)
  title?: string;

  @ApiProperty({ description: 'Review body', minLength: 10, maxLength: 1000 })
  @IsString() @MinLength(10) @MaxLength(1000)
  body!: string;

  @ApiPropertyOptional({ description: 'Service rating (1-5)', minimum: 1, maximum: 5 })
  @IsOptional() @IsInt() @Min(1) @Max(5)
  ratingService?: number;

  @ApiPropertyOptional({ description: 'Price rating (1-5)', minimum: 1, maximum: 5 })
  @IsOptional() @IsInt() @Min(1) @Max(5)
  ratingPrice?: number;

  @ApiPropertyOptional({ description: 'Quality rating (1-5)', minimum: 1, maximum: 5 })
  @IsOptional() @IsInt() @Min(1) @Max(5)
  ratingQuality?: number;
}
