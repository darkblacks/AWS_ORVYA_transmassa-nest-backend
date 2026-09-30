"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const core_1 = require("@nestjs/core");
const app_module_1 = require("./app.module");
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
    const config = app.get(config_1.ConfigService);
    const origins = String(config.get('CORS_ORIGINS') || '')
        .split(',')
        .map(origin => origin.trim())
        .filter(Boolean);
    app.enableCors({ origin: origins.length ? origins : true });
    app.useGlobalPipes(new common_1.ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true
    }));
    await app.listen(Number(config.get('PORT') || 8080), '0.0.0.0');
}
bootstrap();
//# sourceMappingURL=main.js.map