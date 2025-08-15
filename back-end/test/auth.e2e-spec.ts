import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { CreateUserDto } from '../src/modules/user/domain/validators/user.validator';
import { AuthGateway } from '../src/modules/auth/application/gateways/auth.gateway';

describe('AuthController (e2e)', () => {
  let app: INestApplication;
  let httpServer;
  let authGateway: AuthGateway;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.listen(0);
    httpServer = app.getHttpServer();
    authGateway = moduleFixture.get<AuthGateway>(AuthGateway);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Authentication Flow', () => {
    const user: CreateUserDto = {
      email: `test-${Date.now()}@example.com`,
      password: 'Password123',
      username: `testuser-${Date.now()}`,
    };
    let mobileToken: string;
    let userId: string;

    it('/auth/signup (PUT) - should create a new user', async () => {
      await request(httpServer).put('/auth/signup').send(user).expect(201);
    });

    it('/auth/login (POST) - should login and return a mobile token', async () => {
      const response = await request(httpServer)
        .post('/auth/login')
        .send({ email: user.email, password: user.password })
        .expect(201);

      expect(response.body).toHaveProperty('mobileToken');
      mobileToken = response.body.mobileToken;

      const decoded = JSON.parse(
        Buffer.from(mobileToken.split('.')[1], 'base64').toString(),
      );
      userId = decoded.userId;
    });

    describe('QR Login Flow', () => {
      it('should call AuthGateway.sendTokenToClient with correct arguments', async () => {
        const sendTokenSpy = jest.spyOn(authGateway, 'sendTokenToClient');

        const qrFormRes = await request(httpServer)
          .get('/auth/qr-form')
          .expect(200);
        const sessionToken = qrFormRes.body.sessionToken;

        await request(httpServer)
          .post('/auth/qr-login')
          .send({ sessionToken, mobileToken, user: { id: userId } })
          .expect(200);

        expect(sendTokenSpy).toHaveBeenCalledTimes(1);
        expect(sendTokenSpy).toHaveBeenCalledWith(
          sessionToken,
          expect.objectContaining({
            accessToken: expect.any(String),
            refreshToken: expect.any(String),
          }),
        );

        sendTokenSpy.mockRestore();
      });
    });
  });
});
