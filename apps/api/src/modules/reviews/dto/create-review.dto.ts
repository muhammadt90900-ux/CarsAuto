// apps/api/src/modules/reviews/dto/create-review.dto.ts
//
// Named CreateUserReviewDto (not CreateReviewDto) to avoid colliding with
// modules/dealers/dto/create-review.dto.ts, which is for DealerReview — a
// separate model (dealer storefront reviews) from this one (generic
// user-to-user Review, reviewerId/revieweeId). Two different features that
// happen to share the word "review."

import { IsUUID, IsInt, Min, Max, IsString, MinLength, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateUserReviewDto {
  @ApiProperty({ description: 'User being reviewed' })
  @IsUUID()
  revieweeId!: string;

  @ApiProperty({ minimum: 1, maximum: 5 })
  @IsInt()
  @Min(1, { message: 'پلەبەندی پێویستە لە نێوان ١ و ٥ بێت / Rating must be between 1 and 5' })
  @Max(5, { message: 'پلەبەندی پێویستە لە نێوان ١ و ٥ بێت / Rating must be between 1 and 5' })
  rating!: number;

  @ApiProperty({ maxLength: 1000 })
  @IsString()
  @MinLength(3, { message: 'سەرنج زۆر کورتە / Comment is too short' })
  @MaxLength(1000, { message: 'سەرنج زۆر درێژە (زۆرترین ١٠٠٠ پیت) / Comment is too long (max 1000 characters)' })
  comment!: string;
}
