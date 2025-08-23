import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('ExchangeController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('/exchange/candle (GET)', () => {
    it('should return candle data for a valid market', () => {
      return request(app.getHttpServer())
        .get('/exchange/candle?market=KRW-BTC')
        .expect(200)
        .then((response) => {
          expect(Array.isArray(response.body)).toBe(true);
          expect(response.body[0]).toHaveProperty('market', 'KRW-BTC');
          expect(response.body[0]).toHaveProperty('opening_price');
        });
    });

    it('should return 400 for an invalid market', () => {
      return request(app.getHttpServer())
        .get('/exchange/candle?market=KRW-INVALID')
        .expect(400);
    });
  });

  describe('/exchange/orderbook (GET)', () => {
    it('should return orderbook data for a valid market', () => {
      return request(app.getHttpServer())
        .get('/exchange/orderbook?market=KRW-BTC')
        .expect(200)
        .then((response) => {
          expect(Array.isArray(response.body)).toBe(true);
          expect(response.body[0]).toHaveProperty('market', 'KRW-BTC');
          expect(response.body[0]).toHaveProperty('total_ask_size');
          expect(response.body[0]).toHaveProperty('orderbook_units');
        });
    });

    it('should return 400 for an invalid market', () => {
      return request(app.getHttpServer())
        .get('/exchange/orderbook?market=KRW-INVALID')
        .expect(400);
    });
  });
});
