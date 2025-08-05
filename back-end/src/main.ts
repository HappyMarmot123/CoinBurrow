import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { ValidationPipe } from '@nestjs/common';

// Whitelist  -> DTO에 정의되지 않은 속성을 자동으로 제거
// ForbidNonWhitelisted -> 화이트리스트에 정의되지 않은 속성이 있으면 에러 발생
// transform -> 네트워크를 통해 들어온 문자열 타입을 자유롭게 변환

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter(),
  );
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  await app.listen(3000);
}
bootstrap();
