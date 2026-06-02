// apps/api/src/modules/auth/dto/reset-password.dto.ts
import { IsString, MinLength, MaxLength, Matches } from 'class-validator';

export class ResetPasswordDto {
  /** The raw token from the reset link query parameter */
  @IsString()
  @MinLength(16, { message: 'تۆکنەکە نادروستە / Token is invalid' })
  token!: string;

  /** The new password chosen by the user */
  @IsString()
  @MinLength(8, { message: 'پاسوۆردەکە دەبێت لانیکەم ٨ پیت بێت / Password must be at least 8 characters' })
  @MaxLength(128, { message: 'پاسوۆردەکە زۆر درێژە / Password is too long' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message:
      'پاسوۆردەکە دەبێت بەرزوبنچینە و ژمارە تێدابێت / Password must contain uppercase, lowercase and a number',
  })
  newPassword!: string;
}
