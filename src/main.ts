import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { config } from 'dotenv';

async function bootstrap() {
  config();

  const app = await NestFactory.createApplicationContext(AppModule);

  app.enableShutdownHooks();
}

void bootstrap();
