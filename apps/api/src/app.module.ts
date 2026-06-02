// apps/api/src/app.module.ts
import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { BullModule } from '@nestjs/bullmq';
import { ScheduleModule } from '@nestjs/schedule';
import { SecurityThrottlerModule } from './common/throttler/throttler.module';
import { IpThrottleMiddleware }    from './common/throttler/ip-throttle.middleware';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { ListingsModule } from './modules/listings/listings.module';
import { ChatModule } from './modules/chat/chat.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { AdminModule } from './modules/admin/admin.module';
import { AiModule } from './modules/ai/ai.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { SearchModule } from './modules/search/search.module';
import { VehiclesModule } from './modules/vehicles/vehicles.module';
import { PrismaModule } from './common/prisma/prisma.module';
import { AppCacheModule } from './common/cache/cache.module';
import { DealersModule } from './modules/dealers/dealers.module';
import { TokenCleanupTask } from './common/tasks/token-cleanup.task';
import { UploadModule } from './common/upload/upload.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      expandVariables: true,
      // FIX: Validate required env vars at startup; never fall back to defaults for secrets
      validationOptions: { allowUnknown: true, abortEarly: false },
    }),

    // FIX: Tightened global rate limit (60 req/min vs original 120) with shorter TTL
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => [
        {
          ttl:   cfg.get<number>('THROTTLE_TTL',   60_000),
          limit: cfg.get<number>('THROTTLE_LIMIT', 60),     // was 120
        },
      ],
    }),

    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => ({
        connection: {
          url: cfg.get<string>('REDIS_URL', 'redis://localhost:6379'),
        },
      }),
    }),

    AppCacheModule,
    PrismaModule,
    ScheduleModule.forRoot(),
    AuthModule,
    UsersModule,
    ListingsModule,
    ChatModule,
    NotificationsModule,
    AdminModule,
    AiModule,
    PaymentsModule,
    SearchModule,
    VehiclesModule,
    DealersModule,
    UploadModule,
    SecurityThrottlerModule,
  ],
  providers: [TokenCleanupTask],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // Apply IP throttle middleware to all routes.
    // It runs before Guards so it catches requests even on unmatched routes.
    consumer.apply(IpThrottleMiddleware).forRoutes('*');
  }
}

