import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  Logger,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import {
  CreateUserDto,
  LoginUserDto,
} from '@/modules/user/domain/validators/user.validator';
import { User } from '@/modules/user/application/user.entity';
import { UserRepository } from '@/modules/user/domain/repositories/user.repository';
import * as bcrypt from 'bcrypt';
import { plainToInstance } from 'class-transformer';
import { AuthService } from '@/modules/auth/domain/services/auth.service';

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);
  private readonly SALT_ROUNDS: number = parseInt(
    process.env.BCRYPT_SALT_ROUNDS!,
  );

  constructor(
    private readonly userRepository: UserRepository,
    private readonly authService: AuthService,
  ) {}

  async getUserProfile(userId: string): Promise<User> {
    this.logger.log(`Fetching profile for user ID: ${userId}`);
    const user = await this.userRepository.findById(userId);
    if (!user) {
      this.logger.warn(`Profile fetch failed: User not found for ID ${userId}`);
      throw new NotFoundException('User not found');
    }
    return plainToInstance(User, user);
  }

  async login(loginUserDto: LoginUserDto): Promise<{ accessToken: string }> {
    const user = await this.validateUserCredentials(loginUserDto);
    const tokens = await this.authService.getTokens(user);
    const hashedRefreshToken = await bcrypt.hash(
      tokens.refreshToken,
      this.SALT_ROUNDS,
    );

    await this.userRepository.updateRefreshToken(user.id, hashedRefreshToken);
    this.logger.log(
      `Login successful for user: ${user.username} (ID: ${user.id})`,
    );
    return { accessToken: tokens.accessToken };
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
}
