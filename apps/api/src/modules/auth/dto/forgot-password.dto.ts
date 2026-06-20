// apps/api/src/modules/auth/dto/forgot-password.dto.ts
import { IsEmail } from 'class-validator';
import { Transform } from 'class-transformer';

export class ForgotPasswordDto {
  @IsEmail({}, { message: 'ئیمەیڵێکی دروست بنووسە / Please provide a valid email' })
  @Transform(({ value }) => value?.toLowerCase?.().trim())
  email!: string;
}
