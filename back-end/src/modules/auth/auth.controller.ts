import { Controller, Post, Body, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './domain/services/auth.service';
import { JwtService } from '@nestjs/jwt';
import { JwtPayload } from './domain/strategies/jwt-access.strategy';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly jwtService: JwtService,
  ) {}

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
