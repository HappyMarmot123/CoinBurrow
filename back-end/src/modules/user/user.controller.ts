import {
  Controller,
  Post,
  Body,
  UsePipes,
  UseGuards,
  Req,
  Get,
  Put,
} from '@nestjs/common';
import { UserService } from './domain/services/user.service';
import {
  CreateUserDto,
  createUserSchema,
  LoginUserDto,
  loginUserSchema,
} from './domain/validators/user.validator';
import { ZodValidationPipe } from '../../shared/pipes/zod-validation.pipe';
import { JwtAccessGuard } from './application/guards/jwt-access.guard';
import { JwtPayload } from './domain/strategies/jwt-access.strategy';

// 클라언트에서 Access Token과 함께 요청하면 UseGuards 데코레이터가 알아서 서명과 만료 기간을 확인
// 토큰이 유효하지 않으면 JwtAccessGuard가 401 Unauthorized 오류를 반환

// Authorization: Bearer <만료되었을-수도-있는-Access-Token>
// X-Refresh-Token: <유효한-Refresh-Token>

@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('profile')
  @UseGuards(JwtAccessGuard)
  async getProfile(@Req() req: { user: JwtPayload }) {
    return await this.userService.getUserProfile(req.user.userId);
  }

  @Post('login')
  @UsePipes(new ZodValidationPipe(loginUserSchema))
  async login(@Body() loginUserDto: LoginUserDto) {
    return await this.userService.login(loginUserDto);
  }

  @Put('signup')
  @UsePipes(new ZodValidationPipe(createUserSchema))
  async signUp(@Body() createUserDto: CreateUserDto) {
    return await this.userService.createUser(createUserDto);
  }
}
