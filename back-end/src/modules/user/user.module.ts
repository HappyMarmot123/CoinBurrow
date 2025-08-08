import { Module, forwardRef } from '@nestjs/common';
import { UserController } from './user.controller';
import { UserService } from './domain/services/user.service';
import { UserRepository } from './domain/repositories/user.repository';
import { AuthModule } from '../auth/auth.module';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule } from '@nestjs/config';
import { SharedModule } from '@/shared/shared.module';

@Module({
  imports: [
    forwardRef(() => AuthModule),
    JwtModule.register({}),
    ConfigModule,
    SharedModule,
  ],
  controllers: [UserController],
  providers: [UserService, UserRepository],
  exports: [UserService, UserRepository],
})
export class UserModule {}
