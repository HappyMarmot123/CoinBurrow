import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './domain/services/auth.service';
import { JwtAccessStrategy } from './domain/strategies/jwt-access.strategy';
import { UserModule } from '../user/user.module';
import { AuthController } from './auth.controller';
import { AuthGateway } from './application/gateways/auth.gateway';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt-access' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET_KEY'),
        signOptions: {
          expiresIn: configService.get<string>('ACCESS_TOKEN_EXPIRATION_KEY'),
        },
      }),
      inject: [ConfigService],
    }),
    forwardRef(() => UserModule),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtAccessStrategy, AuthGateway],
  exports: [AuthService, PassportModule, JwtAccessStrategy],
})
export class AuthModule {}
