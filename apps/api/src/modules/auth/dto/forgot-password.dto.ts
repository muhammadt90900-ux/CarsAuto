// apps/api/src/modules/auth/dto/forgot-password.dto.ts
import { IsEmail } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class ForgotPasswordDto {
  @ApiProperty({ description: 'Email address to send the password-reset link to', example: 'ahmed@example.com' })
  @IsEmail({}, { message: 'ئیمەیڵێکی دروست بنووسە / Please provide a valid email' })
  @Transform(({ value }) => value?.toLowerCase?.().trim())
  email!: string;
}
