import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { ClassSerializerInterceptor, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';

// Whitelist  -> DTO에 정의되지 않은 속성을 자동으로 제거
// ForbidNonWhitelisted -> 화이트리스트에 정의되지 않은 속성이 있으면 에러 발생
// transform -> 네트워크를 통해 들어온 문자열 타입을 자유롭게 변환
// ClassSerializerInterceptor -> 응답에서 특정 필드를 제외하거나 변환하는 인터셉터
//

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter(),
  );
  const configService = app.get(ConfigService);
  const clientUrl = configService.get<string>('clientUrl');

  app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.enableCors({
    origin: clientUrl,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });
  const port = configService.get<number>('port', 4000);
  await app.listen(port, '0.0.0.0');
}
bootstrap();
