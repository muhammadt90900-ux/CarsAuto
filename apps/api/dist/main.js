"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// apps/api/src/main.ts
const core_1 = require("@nestjs/core");
const common_1 = require("@nestjs/common");
const app_module_1 = require("./app.module");
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
    // ✅ Fix CORS — allow the frontend origin
    app.enableCors({
        origin: process.env.FRONTEND_URL || 'http://localhost:3000',
        credentials: true,
    });
    // ✅ Global ValidationPipe with transform (needed for @Transform decorators in DTOs)
    app.useGlobalPipes(new common_1.ValidationPipe({ whitelist: true, transform: true }));
    app.setGlobalPrefix('api');
    await app.listen(process.env.PORT || 4000);
    console.log(`🚀 API running on http://localhost:${process.env.PORT || 4000}/api`);
}
bootstrap();
