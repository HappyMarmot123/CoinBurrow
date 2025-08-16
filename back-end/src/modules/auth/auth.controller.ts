import {
  Controller,
  Post,
  Body,
  UnauthorizedException,
  UsePipes,
  Put,
  Get,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthService } from './domain/services/auth.service';
import { JwtService } from '@nestjs/jwt';
import { JwtPayload } from './domain/strategies/jwt-access.strategy';
import { QrLoginDto, QrLoginSchema } from './domain/validators/auth.validator';
import { ZodValidationPipe } from '@/shared/pipes/zod-validation.pipe';
import {
  CreateUserDto,
  createUserSchema,
  LoginUserDto,
  loginUserSchema,
} from '../user/domain/validators/user.validator';
import { User } from '../user/application/user.entity';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly jwtService: JwtService,
  ) {}

  @Post('qr-login')
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ZodValidationPipe(QrLoginSchema))
  async qrLogin(@Body() qrLoginDto: QrLoginDto): Promise<void> {
    return this.authService.qrLogin(qrLoginDto);
  }

  @Post('login')
  @UsePipes(new ZodValidationPipe(loginUserSchema))
  async login(
    @Body() loginUserDto: LoginUserDto,
  ): Promise<{ mobileToken: string; user: User }> {
    return await this.authService.login(loginUserDto);
  }

  @Put('signup')
  @HttpCode(HttpStatus.CREATED)
  @UsePipes(new ZodValidationPipe(createUserSchema))
  async signUp(@Body() createUserDto: CreateUserDto) {
    return await this.authService.createUser(createUserDto);
  }

  @Post('refresh')
  async refreshAccessToken(
    @Body('expiredToken') expiredToken: string,
  ): Promise<{ accessToken: string }> {
    if (!expiredToken) {
      throw new UnauthorizedException('No token provided');
    }

    try {
      const payload = this.jwtService.decode(expiredToken) as JwtPayload;

      if (!payload || !payload.userId) {
        throw new UnauthorizedException('Invalid token');
      }

      return await this.authService.refreshAccessToken(payload);
    } catch (error) {
      throw new UnauthorizedException('Invalid token');
    }
  }
}
