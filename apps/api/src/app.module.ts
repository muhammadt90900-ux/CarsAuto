// apps/api/src/app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { ListingsModule } from './modules/listings/listings.module';
import { ChatModule } from './modules/chat/chat.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { AdminModule } from './modules/admin/admin.module';
import { AiModule } from './modules/ai/ai.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { SearchModule } from './modules/search/search.module';
import { PrismaModule } from './common/prisma/prisma.module';

@Module({
  imports: [
    // ── Config (global, so all modules can inject ConfigService) ──────────
    ConfigModule.forRoot({
      isGlobal: true,
      // In production, all required vars must be present at startup
      expandVariables: true,
    }),

    // ── Global rate limiting: generous defaults, auth module overrides ─────
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => [
        {
          ttl: cfg.get<number>('THROTTLE_TTL', 60_000),
          limit: cfg.get<number>('THROTTLE_LIMIT', 120),
        },
      ],
    }),

    PrismaModule,
    AuthModule,
    UsersModule,
    ListingsModule,
    ChatModule,
    NotificationsModule,
    AdminModule,
    AiModule,
    PaymentsModule,
    SearchModule,
  ],
})
export class AppModule {}
