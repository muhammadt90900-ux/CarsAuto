// apps/api/src/app.module.ts

import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { ConfigModule, ConfigService }            from '@nestjs/config';
import { ThrottlerModule }                        from '@nestjs/throttler';
import { BullModule }                             from '@nestjs/bullmq';
import { ScheduleModule }                         from '@nestjs/schedule';
import { EventEmitterModule }                     from '@nestjs/event-emitter';
import { SecurityThrottlerModule }  from './common/throttler/throttler.module';
import { IpThrottleMiddleware }     from './common/throttler/ip-throttle.middleware';
import { MonitoringModule }         from './common/monitoring/monitoring.module';
import { AuthModule }               from './modules/auth/auth.module';
import { UsersModule }              from './modules/users/users.module';
import { ListingsModule }           from './modules/listings/listings.module';
import { ChatModule }               from './modules/chat/chat.module';
import { NotificationsModule }      from './modules/notifications/notifications.module';
import { AdminModule }              from './modules/admin/admin.module';
import { AiModule }                 from './modules/ai/ai.module';
import { PaymentsModule }           from './modules/payments/payments.module';
import { SearchModule }             from './modules/search/search.module';
import { VehiclesModule }           from './modules/vehicles/vehicles.module';
import { PrismaModule }             from './common/prisma/prisma.module';
import { AppCacheModule }           from './common/cache/cache.module';
import { CurrencyModule }           from './common/currency/currency.module';
import { DealersModule }            from './modules/dealers/dealers.module';
import { TasksModule }              from './common/tasks/tasks.module';
import { UploadModule }             from './common/upload/upload.module';
import { OpenAiModule }            from './common/ai/openai.module';
import { SubscriptionsModule }      from './modules/subscriptions/subscriptions.module';
import { SearchIndexCommonModule }  from './common/search-index/search-index.module';
import { SearchIndexingModule }     from './modules/search-indexing/search-index.module';
import { FraudModule }              from './modules/fraud/fraud.module';
import { VerificationModule }       from './modules/verification/verification.module';
import { DuplicateDetectionModule } from './modules/duplicate-detection/duplicate-detection.module';
import { SuspiciousActivityModule } from './modules/suspicious-activity/suspicious-activity.module';
import { ReviewsModule } from './modules/reviews/reviews.module';
import { ReportsModule } from './modules/reports/reports.module';
import { StatsModule } from './modules/stats/stats.module';
import { NewsletterModule } from './modules/newsletter/newsletter.module';
import { BetaModule } from './modules/beta/beta.module';
import { ReferralsModule } from './modules/referrals/referrals.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal:          true,
      expandVariables:   true,
      validationOptions: { allowUnknown: true, abortEarly: false },
    }),

    ThrottlerModule.forRootAsync({
      imports:    [ConfigModule],
      inject:     [ConfigService],
      useFactory: (cfg: ConfigService) => [
        { ttl: cfg.get<number>('THROTTLE_TTL', 60_000), limit: cfg.get<number>('THROTTLE_LIMIT', 60) },
      ],
    }),

    BullModule.forRootAsync({
      imports:    [ConfigModule],
      inject:     [ConfigService],
      useFactory: (cfg: ConfigService) => ({
        connection: { url: cfg.get<string>('REDIS_URL', 'redis://localhost:6379') },
      }),
    }),

    // ── Core infrastructure ────────────────────────────────────────────────
    AppCacheModule,
    PrismaModule,
    ScheduleModule.forRoot(),
    // F-ARCH fix: domain events — decouples ListingsService from
    // DealersService (see common/events/, modules/dealers/dealer.listeners.ts).
    // global: true means EventEmitter2 is injectable anywhere without each
    // feature module needing to import EventEmitterModule itself.
    EventEmitterModule.forRoot({ wildcard: true, delimiter: '.', global: true }),

    // ── Monitoring (global — must be before feature modules) ──────────────
    MonitoringModule,

    // Search Architecture Phase 1: global Meilisearch client wrapper +
    // the domain-event → BullMQ dual-write pipeline. Registered here
    // (not inside a feature module) so AdminModule can also depend on
    // SearchIndexingModule's exported queue for the full-reindex endpoint
    // without a circular import.
    SearchIndexCommonModule,
    SearchIndexingModule,

    // ── Feature modules ────────────────────────────────────────────────────
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
    OpenAiModule,
    SecurityThrottlerModule,
    SubscriptionsModule,
    CurrencyModule,
    FraudModule,
    VerificationModule,
    TasksModule,
    DuplicateDetectionModule,
    SuspiciousActivityModule,
    ReviewsModule,
    ReportsModule,
    StatsModule,
    NewsletterModule,
    BetaModule,
    ReferralsModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(IpThrottleMiddleware).forRoutes('*');
  }
}
