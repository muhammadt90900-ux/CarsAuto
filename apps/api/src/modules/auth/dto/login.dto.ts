// apps/api/src/modules/auth/dto/login.dto.ts
import { IsEmail, IsString, MinLength, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';

export class LoginDto {
  @IsEmail({}, { message: 'ئیمەیڵی دروست بنووسە / Please enter a valid email address' })
  @MaxLength(254, { message: 'ئیمەیڵ زۆر درێژە / Email is too long' })
  @Transform(({ value }) => value?.trim()?.toLowerCase())
  email!: string;

  @IsString()
  @MinLength(8, { message: 'پاسوۆرد دەبێت لانیکەم ٨ پیت بێت / Password must be at least 8 characters' })
  @MaxLength(128, { message: 'پاسوۆرد زۆر درێژە / Password is too long' })
  password!: string;
}
