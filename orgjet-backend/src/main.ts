import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import * as express from 'express';
import { join } from 'path';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { cors: true });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  const port = Number(process.env.PORT || 3000);
  const origin = process.env.CORS_ORIGIN || 'http://localhost:5173';
  app.enableCors({ origin, credentials: true });

  // Serve local uploads
  app.use('/uploads', express.static(join(process.cwd(), 'uploads')));

  await app.listen(port, '0.0.0.0');
  console.log(`OrgJet API running on http://localhost:${port}`);
}
bootstrap();