import {
  Injectable,
  UnauthorizedException,
  Logger,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import {
  EmailDto,
  ResetPasswordDto,
} from '@/modules/user/domain/validators/user.validator';
import { User } from '@/modules/user/application/user.entity';
import { UserRepository } from '@/modules/user/domain/repositories/user.repository';
import * as bcrypt from 'bcrypt';
import { plainToInstance } from 'class-transformer';
import { EmailService } from '@/shared/services/email.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);
  private readonly SALT_ROUNDS: number = parseInt(
    process.env.BCRYPT_SALT_ROUNDS!,
  );

  constructor(
    private readonly userRepository: UserRepository,
    private readonly emailService: EmailService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async sendPasswordResetEmail(emailDto: EmailDto): Promise<void> {
    const { email } = emailDto;
    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      this.logger.warn(
        `Password reset request for non-existent email: ${email}`,
      );
      return;
    }

    const payload = { sub: user.id, email: user.email };
    const token = this.jwtService.sign(payload, {
      secret: this.configService.get('JWT_SECRET_KEY'),
      expiresIn: '5m',
    });

    const resetLink = `${this.configService.get(
      'EMAIL_RESET_VIEW_REDIRECT',
    )}?token=${token}`;

    await this.emailService.sendResetPWEmail(user.email, resetLink);
    this.logger.log(`Password reset email sent to: ${user.email}`);
  }

  async resetPassword(resetPasswordDto: ResetPasswordDto): Promise<void> {
    const { token, password } = resetPasswordDto;
    try {
      const payload = this.jwtService.verify(token, {
        secret: this.configService.get('JWT_RESET_SECRET'),
      });

      const user = await this.userRepository.findById(payload.sub);
      if (!user) {
        throw new NotFoundException('User not found');
      }

      const hashedPassword = await bcrypt.hash(password, this.SALT_ROUNDS);
      await this.userRepository.updatePassword(user.id, hashedPassword);

      this.logger.log(`Password has been reset for user: ${user.email}`);
    } catch (error) {
      this.logger.error('Invalid or expired password reset token', error.stack);
      throw new UnauthorizedException(
        'Invalid or expired password reset token.',
      );
    }
  }

  async getUserProfile(userId: string): Promise<User> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      this.logger.warn(`Profile fetch failed: User not found for ID ${userId}`);
      throw new NotFoundException('User not found');
    }
    return plainToInstance(User, user);
  }
}
