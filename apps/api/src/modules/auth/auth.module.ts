// apps/api/src/modules/auth/auth.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ThrottlerModule } from '@nestjs/throttler';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtRefreshStrategy } from './strategies/jwt-refresh.strategy';
import { UsersModule } from '../users/users.module';
import { PrismaModule } from '../../common/prisma/prisma.module';

@Module({
  imports: [
    ConfigModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),

    // ── Access-token JWT (15 min) ──────────────────────────────────────────
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => ({
        secret: cfg.getOrThrow<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: cfg.get<string>('JWT_EXPIRES_IN', '15m'),
          issuer: 'car-platform',
          audience: 'car-platform-client',
        },
      }),
    }),

    // ── Per-route rate limiting (stricter for auth endpoints) ──────────────
    AuthModule([
      { name: 'auth', ttl: 60_000, limit: 10 }, // 10 req / min on auth routes
    ]),

    UsersModule,
    PrismaModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, JwtRefreshStrategy],
  exports: [AuthService, JwtModule],
})
export class AuthModule {}
