import { Injectable } from '@nestjs/common';
import { User } from '@/modules/user/application/user.entity';
import { CreateUserDto } from '@/modules/user/domain/validators/user.validator';

@Injectable()
export class UserRepository {
  private readonly users: User[] = [];

  async findByEmail(email: string): Promise<User | null> {
    const user = this.users.find((user) => user.email === email);
    return user || null;
  }

  async findByUsername(username: string): Promise<User | null> {
    const user = this.users.find((user) => user.username === username);
    return user || null;
  }

  async createUser(
    createUserDto: CreateUserDto,
    hashedPassword,
  ): Promise<User> {
    const newUser = new User({
      id: `${this.users.length + 1}`,
      ...createUserDto,
      password: hashedPassword,
      createdAt: new Date(),
    });
    this.users.push(newUser);
    return newUser;
  }
}
