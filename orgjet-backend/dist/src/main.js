"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const app_module_1 = require("./app.module");
const common_1 = require("@nestjs/common");
const express = require("express");
const path_1 = require("path");
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule, { cors: true });
    app.useGlobalPipes(new common_1.ValidationPipe({ whitelist: true, transform: true }));
    const port = Number(process.env.PORT || 3000);
    const origin = process.env.CORS_ORIGIN || 'http://localhost:5173';
    app.enableCors({ origin, credentials: true });
    app.use('/uploads', express.static((0, path_1.join)(process.cwd(), 'uploads')));
    await app.listen(process.env.PORT || 3000, '0.0.0.0');
    console.log(`OrgJet API running on http://localhost:${port}`);
}
bootstrap();
//# sourceMappingURL=main.js.map