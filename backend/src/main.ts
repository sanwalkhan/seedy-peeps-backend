import { NestFactory } from '@nestjs/core';
import * as express from 'express'; // Import express module
import { AppModule } from './app.module';
const port = process.env.PORT || 3000;
async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // Configure Express middleware for handling JSON payloads with a limit of 10MB
  app.use(express.json({ limit: '10mb' }));
  app.enableCors();
  // app.useGlobalPipes(new ValidationPipe());

  await app.listen(port, '0.0.0.0');
}
bootstrap();
