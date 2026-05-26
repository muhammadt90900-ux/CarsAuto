"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
// apps/api/src/app.module.ts
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const throttler_1 = require("@nestjs/throttler");
const auth_module_1 = require("./modules/auth/auth.module");
const users_module_1 = require("./modules/users/users.module");
const listings_module_1 = require("./modules/listings/listings.module");
const chat_module_1 = require("./modules/chat/chat.module");
const notifications_module_1 = require("./modules/notifications/notifications.module");
const admin_module_1 = require("./modules/admin/admin.module");
const ai_module_1 = require("./modules/ai/ai.module");
const payments_module_1 = require("./modules/payments/payments.module");
const search_module_1 = require("./modules/search/search.module");
const prisma_module_1 = require("./common/prisma/prisma.module");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            // ── Config (global, so all modules can inject ConfigService) ──────────
            config_1.ConfigModule.forRoot({
                isGlobal: true,
                // In production, all required vars must be present at startup
                expandVariables: true,
            }),
            // ── Global rate limiting: generous defaults, auth module overrides ─────
            throttler_1.ThrottlerModule.forRootAsync({
                imports: [config_1.ConfigModule],
                inject: [config_1.ConfigService],
                useFactory: (cfg) => [
                    {
                        ttl: cfg.get('THROTTLE_TTL', 60_000),
                        limit: cfg.get('THROTTLE_LIMIT', 120),
                    },
                ],
            }),
            prisma_module_1.PrismaModule,
            auth_module_1.AuthModule,
            users_module_1.UsersModule,
            listings_module_1.ListingsModule,
            chat_module_1.ChatModule,
            notifications_module_1.NotificationsModule,
            admin_module_1.AdminModule,
            ai_module_1.AiModule,
            payments_module_1.PaymentsModule,
            search_module_1.SearchModule,
        ],
    })
], AppModule);
