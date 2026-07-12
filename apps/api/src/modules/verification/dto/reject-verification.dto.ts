// apps/api/src/modules/verification/dto/reject-verification.dto.ts
import { IsString, MinLength, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RejectVerificationDto {
  @ApiProperty({
    description: 'Reason shown to the user for why their verification was rejected',
    example: 'Document photo is blurry / illegible',
    maxLength: 255,
  })
  @IsString()
  @MinLength(3, {
    message: 'هۆکاری ڕەتکردنەوە پێویستە / A rejection reason is required',
  })
  @MaxLength(255, {
    message: 'هۆکارەکە زۆر درێژە (زۆرترین ٢٥٥ پیت) / Reason is too long (max 255 characters)',
  })
  reason!: string;
}
