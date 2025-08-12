import {
  Injectable,
  InternalServerErrorException,
  Logger,
  ForbiddenException,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { User } from '@/modules/user/application/user.entity';
import { UserRepository } from '@/modules/user/domain/repositories/user.repository';
import { JwtPayload } from '@/modules/auth/domain/strategies/jwt-access.strategy';
import { QrLoginDto } from '../validators/auth.validator';
import * as bcrypt from 'bcrypt';
import {
  CreateUserDto,
  LoginUserDto,
} from '@/modules/user/domain/validators/user.validator';
import { plainToInstance } from 'class-transformer';
import { AuthGateway } from '../../application/gateways/auth.gateway';

export interface Tokens {
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly SALT_ROUNDS: number = parseInt(
    process.env.BCRYPT_SALT_ROUNDS!,
  );
  private readonly accessSecret: string;
  private readonly refreshSecret: string;
  private readonly accessExpiration: string;
  private readonly refreshExpiration: string;

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly userRepository: UserRepository,
    private readonly authGateway: AuthGateway,
  ) {
    try {
      this.accessSecret = this.configService.get<string>('JWT_SECRET_KEY')!;
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

  async login(loginUserDto: LoginUserDto): Promise<{ mobileToken: string }> {
    const user = await this.validateUserCredentials(loginUserDto);

    const mobileToken = await this.generateToken(
      { userId: user.id, username: user.username },
      this.accessSecret,
    );

    const hashedMobileToken = await bcrypt.hash(mobileToken, this.SALT_ROUNDS);
    await this.userRepository.updateMobileToken(user.id, hashedMobileToken);

    this.logger.log(
      `Mobile login successful for user: ${user.username} (ID: ${user.id})`,
    );
    return { mobileToken };
  }

  async qrForm(): Promise<{ sessionToken: string }> {
    const payload = { timestamp: Date.now() };
    const sessionToken = this.jwtService.sign(payload, {
      secret: this.configService.get('JWT_SECRET_KEY'),
      expiresIn: '5m',
    });

    this.logger.log('Generated session token for QR login');
    return { sessionToken };
  }

  async createUser(createUserDto: CreateUserDto): Promise<User> {
    const { username, email, password } = createUserDto;
    this.logger.log(`Creating a new user with username: ${username}`);

    const userByEmail = await this.userRepository.findByEmail(email);
    if (userByEmail) throw new ConflictException('Email already exists');

    const userByUsername = await this.userRepository.findByUsername(username);
    if (userByUsername) throw new ConflictException('Username already exists');

    const hashedPassword = await bcrypt.hash(password, this.SALT_ROUNDS);

    const newUser = await this.userRepository.createUser(
      createUserDto,
      hashedPassword,
    );
    this.logger.log(
      `Successfully created user: ${newUser.username} (ID: ${newUser.id})`,
    );

    return plainToInstance(User, newUser);
  }

  private async validateUserCredentials(
    loginUserDto: LoginUserDto,
  ): Promise<User> {
    const { email, password } = loginUserDto;
    const user = await this.userRepository.findByEmail(email);

    if (!user) {
      this.logger.warn(`Login failed: No user found for email ${email}`);
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordMatching = await bcrypt.compare(password, user.password!);

    if (!isPasswordMatching) {
      this.logger.warn(
        `Login failed: Invalid password for user ${user.username} (ID: ${user.id})`,
      );
      throw new UnauthorizedException('Invalid credentials');
    }

    return user;
  }

  async qrLogin(qrLoginDto: QrLoginDto): Promise<void> {
    const { sessionToken, mobileToken, user } = qrLoginDto;

    try {
      this.jwtService.verify(sessionToken, {
        secret: this.accessSecret,
      });
    } catch (error) {
      this.logger.warn('Invalid or expired session token');
      throw new UnauthorizedException('Invalid or expired session token.');
    }

    try {
      const decodedMobileToken = this.jwtService.verify<JwtPayload>(
        mobileToken,
        {
          secret: this.accessSecret,
        },
      );

      if (decodedMobileToken.userId !== user.id) {
        throw new UnauthorizedException('User does not match');
      }

      const foundUser = await this.userRepository.findById(user.id);
      if (!foundUser || !foundUser.hashedMobileToken) {
        throw new UnauthorizedException(
          'User not found or mobile token invalid',
        );
      }

      const isTokenMatching = await bcrypt.compare(
        mobileToken,
        foundUser.hashedMobileToken,
      );
      if (!isTokenMatching) {
        throw new UnauthorizedException('Invalid mobile token');
      }

      const tokens = await this.getTokens(foundUser);
      const hashedRefreshToken = await bcrypt.hash(tokens.refreshToken, 10);

      await this.userRepository.updateRefreshToken(
        foundUser.id,
        hashedRefreshToken,
      );

      this.logger.log(
        `QR Login successful for user: ${foundUser.username} (ID: ${foundUser.id})`,
      );

      this.authGateway.sendTokenToClient(sessionToken, tokens);
    } catch (error) {
      this.logger.error(`QR login failed: ${error.message}`, error.stack);
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new InternalServerErrorException('QR login processing failed.');
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
    expiresIn?: string,
  ): Promise<string> {
    const signOptions = { secret };
    if (expiresIn) {
      signOptions['expiresIn'] = expiresIn;
    }
    return this.jwtService.signAsync(payload, signOptions);
  }
}
