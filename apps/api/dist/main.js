"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// apps/api/src/main.ts
const core_1 = require("@nestjs/core");
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const compression_1 = __importDefault(require("compression"));
const helmet_1 = __importDefault(require("helmet"));
const app_module_1 = require("./app.module");
async function bootstrap() {
    const logger = new common_1.Logger('Bootstrap');
    const app = await core_1.NestFactory.create(app_module_1.AppModule, {
        logger: ['error', 'warn', 'log', 'debug'],
    });
    const cfg = app.get(config_1.ConfigService);
    const isProduction = cfg.get('NODE_ENV') === 'production';
    const frontendUrl = cfg.getOrThrow('FRONTEND_URL');
    const port = cfg.get('PORT', 4000);
    // ── Security headers (Helmet) ─────────────────────────────────────────────
    app.use((0, helmet_1.default)({
        contentSecurityPolicy: isProduction
            ? {
                directives: {
                    defaultSrc: ["'self'"],
                    scriptSrc: ["'self'"],
                    styleSrc: ["'self'", "'unsafe-inline'"],
                    imgSrc: ["'self'", 'data:', 'https:'],
                    connectSrc: ["'self'"],
                    fontSrc: ["'self'"],
                    objectSrc: ["'none'"],
                    upgradeInsecureRequests: [],
                },
            }
            : false, // Disable CSP in development for easier debugging
        crossOriginEmbedderPolicy: false,
    }));
    // ── CORS ─────────────────────────────────────────────────────────────────
    app.enableCors({
        origin: (origin, callback) => {
            const allowedOrigins = [
                frontendUrl,
                ...(isProduction ? [] : ['http://localhost:3000', 'http://127.0.0.1:3000']),
            ];
            if (!origin || allowedOrigins.includes(origin)) {
                callback(null, true);
            }
            else {
                callback(new Error(`CORS: Origin ${origin} not allowed`));
            }
        },
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
        exposedHeaders: ['X-Total-Count'],
        maxAge: 86400, // 24 h preflight cache
    });
    // ── Cookie parser (required for refresh-token cookies) ───────────────────
    const cookieSecret = cfg.getOrThrow('COOKIE_SECRET');
    app.use((0, cookie_parser_1.default)(cookieSecret));
    // ── Compression ───────────────────────────────────────────────────────────
    app.use((0, compression_1.default)());
    // ── Global ValidationPipe ─────────────────────────────────────────────────
    app.useGlobalPipes(new common_1.ValidationPipe({
        whitelist: true, // strip unknown properties
        forbidNonWhitelisted: true, // throw on unknown properties
        transform: true, // auto-transform payloads to DTO types
        transformOptions: { enableImplicitConversion: true },
        stopAtFirstError: false, // collect all validation errors
    }));
    // ── Global prefix ─────────────────────────────────────────────────────────
    app.setGlobalPrefix('api');
    // ── Graceful shutdown ─────────────────────────────────────────────────────
    app.enableShutdownHooks();
    await app.listen(port);
    logger.log(`🚀 API running on http://localhost:${port}/api`);
    logger.log(`🌍 Environment: ${isProduction ? 'production' : 'development'}`);
}
bootstrap().catch((err) => {
    new common_1.Logger('Bootstrap').error('Failed to start', err);
    process.exit(1);
});
