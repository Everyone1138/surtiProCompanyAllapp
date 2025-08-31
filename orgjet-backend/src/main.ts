import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { cors: true });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  const port = process.env.PORT || 3000;
  const origin = process.env.CORS_ORIGIN || 'http://localhost:5173';
  app.enableCors({ origin, credentials: true });
  await app.listen(port);
  console.log(`OrgJet API running on http://localhost:${port}`);
}
bootstrap();
