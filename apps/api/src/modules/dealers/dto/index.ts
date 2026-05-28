// apps/api/src/modules/dealers/dto/create-review.dto.ts
import { IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';

export class CreateReviewDto {
  @IsInt() @Min(1) @Max(5)           rating: number;
  @IsOptional() @IsString() @MaxLength(120) title?: string;
  @IsString() @MinLength(10) @MaxLength(1000) body: string;
  @IsOptional() @IsInt() @Min(1) @Max(5)  ratingService?: number;
  @IsOptional() @IsInt() @Min(1) @Max(5)  ratingPrice?: number;
  @IsOptional() @IsInt() @Min(1) @Max(5)  ratingQuality?: number;
}

// ─────────────────────────────────────────────────────────────────────────────

// apps/api/src/modules/dealers/dto/dealer-query.dto.ts
import { IsEnum, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { DealerTier } from '@prisma/client';

export class DealerQueryDto {
  @IsOptional() @IsString()                       search?: string;
  @IsOptional() @IsString()                       city?: string;
  @IsOptional() @IsEnum(DealerTier)               tier?: DealerTier;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(1) @Max(5) minRating?: number;
  @IsOptional() @IsString()                       sortBy?: 'rating' | 'listings' | 'reviews' | 'newest';
  @IsOptional() @Type(() => Number) @IsNumber() @Min(1)  page?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(1) @Max(100) limit?: number;
}

// ─────────────────────────────────────────────────────────────────────────────

// apps/api/src/modules/dealers/dto/contact-dealer.dto.ts
import { IsEmail, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class ContactDealerDto {
  @IsString() @MinLength(2) @MaxLength(80)        name: string;
  @IsOptional() @IsString()                       phone?: string;
  @IsOptional() @IsEmail()                        email?: string;
  @IsString() @MinLength(5) @MaxLength(1000)      message: string;
  @IsOptional() @IsString()                       channel?: 'form' | 'whatsapp' | 'phone';
  @IsOptional() @IsString()                       listingId?: string;
}
