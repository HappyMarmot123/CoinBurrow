import { Controller, Post, Body, UsePipes } from '@nestjs/common';
import { UserService } from './domain/services/user.service';
import { CreateUserDto } from './domain/validators/user.validator';
import { ZodValidationPipe } from '../../shared/pipes/zod-validation.pipe';
import { createUserSchema } from './domain/validators/user.validator';

@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post('signup')
  @UsePipes(new ZodValidationPipe(createUserSchema))
  async signUp(@Body() createUserDto: CreateUserDto) {
    return await this.userService.createUser(createUserDto);
  }
}
