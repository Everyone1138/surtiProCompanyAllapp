"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const app_module_1 = require("./app.module");
const common_1 = require("@nestjs/common");
const express = require("express");
const path_1 = require("path");
function parseOrigins(raw) {
    const v = (raw && raw.trim()) ? raw : 'https://workjetworks.com';
    return new Set(v
        .split(',')
        .map(s => s.trim())
        .filter(Boolean));
}
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule, { cors: false });
    app.useGlobalPipes(new common_1.ValidationPipe({ whitelist: true, transform: true }));
    const port = Number(process.env.PORT || 3000);
    const allowed = parseOrigins(process.env.CORS_ORIGIN);
    app.enableCors({
        origin(origin, cb) {
            if (!origin || allowed.has(origin))
                return cb(null, true);
            return cb(new Error('CORS: origin not allowed'));
        },
        credentials: true,
        methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
        allowedHeaders: 'Content-Type,Authorization',
        optionsSuccessStatus: 204,
    });
    app.use('/uploads', express.static((0, path_1.join)(process.cwd(), 'uploads')));
    await app.listen(port, '0.0.0.0');
    console.log(`OrgJet API running on http://localhost:${port}`);
}
bootstrap();
//# sourceMappingURL=main.js.map