import { Injectable, ConflictException } from '@nestjs/common';
import { CreateUserDto } from '@/modules/user/domain/validators/user.validator';
import { User } from '@/modules/user/application/user.entity';
import { UserRepository } from '@/modules/user/domain/repositories/user.repository';
import * as bcrypt from 'bcrypt';
import { EmailService } from '@/shared/services/email.service';
import { plainToInstance } from 'class-transformer';

@Injectable()
export class UserService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly emailService: EmailService,
  ) {}

  async createUser(createUserDto: CreateUserDto): Promise<User> {
    const { username, email, password } = createUserDto;

    const existingUserByEmail = await this.userRepository.findByEmail(email);
    if (existingUserByEmail) {
      throw new ConflictException('Email already exists');
    }

    const existingUserByUsername =
      await this.userRepository.findByUsername(username);
    if (existingUserByUsername) {
      throw new ConflictException('Username already exists');
    }

    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    const newUser = await this.userRepository.createUser(
      createUserDto,
      hashedPassword,
    );

    await this.emailService.sendWelcomeEmail(newUser.email, newUser.username);

    // Use plainToInstance to convert the plain object to a class instance,
    // which respects the @Exclude() decorator in the User entity.
    return plainToInstance(User, newUser);
  }
}
