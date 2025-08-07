import {
  Injectable,
  InternalServerErrorException,
  Logger,
  ForbiddenException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { User } from '@/modules/user/application/user.entity';
import { UserRepository } from '@/modules/user/domain/repositories/user.repository';
import { JwtPayload } from '@/modules/auth/domain/strategies/jwt-access.strategy';

export interface Tokens {
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly accessSecret: string;
  private readonly refreshSecret: string;
  private readonly accessExpiration: string;
  private readonly refreshExpiration: string;

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly userRepository: UserRepository,
  ) {
    try {
      this.accessSecret = this.configService.get<string>(
        'ACCESS_TOKEN_SECRET_KEY',
      )!;
      this.refreshSecret = this.configService.get<string>(
        'REFRESH_TOKEN_SECRET_KEY',
      )!;
      this.accessExpiration = this.configService.get<string>(
        'ACCESS_TOKEN_EXPIRATION_KEY',
      )!;
      this.refreshExpiration = this.configService.get<string>(
        'REFRESH_TOKEN_EXPIRATION_KEY',
      )!;
    } catch (error) {
      this.logger.error('JWT configuration missing!', error.stack);
      throw new InternalServerErrorException(
        'Missing required JWT configuration',
      );
    }
  }

  async getTokens(user: User): Promise<Tokens> {
    const payload: JwtPayload = { userId: user.id, username: user.username };
    const [accessToken, refreshToken] = await Promise.all([
      this.generateToken(payload, this.accessSecret, this.accessExpiration),
      this.generateToken(payload, this.refreshSecret, this.refreshExpiration),
    ]);
    return { accessToken, refreshToken };
  }

  async refreshAccessToken(
    payload: JwtPayload,
  ): Promise<{ accessToken: string }> {
    this.logger.log(
      `Access token refresh attempt for user ID: ${payload.userId}`,
    );
    const user = await this.userRepository.findById(payload.userId);

    if (!user || !user.hashedRefreshToken) {
      this.logger.warn(
        `Refresh attempt for user without a refresh token. UserID: ${payload.userId}`,
      );
      throw new ForbiddenException('Access Denied');
    }

    const newAccessToken = await this.generateToken(
      { userId: user.id, username: user.username },
      this.accessSecret,
      this.accessExpiration,
    );

    this.logger.log(
      `Successfully refreshed access token for user: ${user.username} (ID: ${user.id})`,
    );
    return { accessToken: newAccessToken };
  }

  private async generateToken(
    payload: object,
    secret: string,
    expiresIn: string,
  ): Promise<string> {
    return this.jwtService.signAsync(payload, {
      secret,
      expiresIn,
    });
  }
}
