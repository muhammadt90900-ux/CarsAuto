// apps/api/src/modules/auth/auth.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport'
import { ThrottlerModule } from '@nestjs/throttler';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtRefreshStrategy } from './strategies/jwt-refresh.strategy';
import { UsersModule } from '../users/users.module';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { EmailService } from '../../common/email/email.service';
import { EmailVerifiedGuard } from '../../common/guards/email-verified.guard';
import { OtpProtectionService } from '../../common/throttler/otp-protection.service';
import { AppCacheModule } from '../../common/cache/cache.module';

@Module({
  imports: [
    ConfigModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),

    JwtModule.registerAsync({
      imports:    [ConfigModule],
      inject:     [ConfigService],
      useFactory: (cfg: ConfigService) => ({
        secret:      cfg.getOrThrow<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: cfg.get<string>('JWT_EXPIRES_IN', '15m'),
          issuer:    'car-platform',
          audience:  'car-platform-client',
        },
      }),
    }),

    // Auth module throttle defaults — individual endpoints override via @Throttle().
    // Forgot/reset endpoints apply THROTTLE_RESET_REQUEST / THROTTLE_RESET_CONFIRM
    // defined in auth.controller.ts (5 or 10 req / 15 min per IP).
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 10 }]),

    AppCacheModule,
    UsersModule,
    PrismaModule,
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,
    JwtRefreshStrategy,
    EmailService,
    EmailVerifiedGuard,
    OtpProtectionService,
  ],
  exports: [AuthService, JwtModule, EmailVerifiedGuard, EmailService, OtpProtectionService],
})
export class AuthModule {}
