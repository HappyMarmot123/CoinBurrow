import { Module } from '@nestjs/common';
import { UserController } from './user.controller';
import { UserService } from './domain/services/user.service';
import { UserRepository } from './domain/repositories/user.repository';

@Module({
  controllers: [UserController],
  providers: [UserService, UserRepository],
})
export class UserModule {}
