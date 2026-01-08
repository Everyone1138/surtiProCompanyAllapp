import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import * as express from 'express';
import { join } from 'path';

function parseOrigins(raw?: string): Set<string> {
  const v = (raw && raw.trim()) ? raw : 'https://workjetworks.com';
  return new Set(
    v
      .split(',')
      .map(s => s.trim())
      .filter(Boolean)
  );
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { cors: false });
  app.setGlobalPrefix('api');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  const port = Number(process.env.PORT || 3000);

  const allowed = parseOrigins(process.env.CORS_ORIGIN); // comma-separated list
  app.enableCors({
    origin(origin, cb) {
      // allow server-to-server/no-origin (curl, health checks) and any whitelisted origin
      if (!origin || allowed.has(origin)) return cb(null, true);
      return cb(new Error('CORS: origin not allowed'));
    },
    credentials: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    allowedHeaders: 'Content-Type,Authorization',
    optionsSuccessStatus: 204,
  });

  app.use('/uploads', express.static(join(process.cwd(), 'uploads')));

  await app.listen(port, '0.0.0.0');
  console.log(`OrgJet API running on http://localhost:${port}`);
}
bootstrap();