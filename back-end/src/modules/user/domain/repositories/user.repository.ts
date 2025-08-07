import { Inject, Injectable } from '@nestjs/common';
import { User } from '@/modules/user/application/user.entity';
import { CreateUserDto } from '@/modules/user/domain/validators/user.validator';
import { DRIZZLE_INSTANCE } from '@/core/database/drizzle.module';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import * as schema from '@/core/database/schema';
import { eq } from 'drizzle-orm';

@Injectable()
export class UserRepository {
  constructor(
    @Inject(DRIZZLE_INSTANCE)
    private readonly db: PostgresJsDatabase<typeof schema>,
  ) {}

  async findByEmail(email: string): Promise<User | null> {
    const [user] = await this.db
      .select()
      .from(schema.users)
      .where(eq(schema.users.email, email));
    return user ? new User(user) : null;
  }

  async findByUsername(username: string): Promise<User | null> {
    const [user] = await this.db
      .select()
      .from(schema.users)
      .where(eq(schema.users.username, username));
    return user ? new User(user) : null;
  }

  async findById(id: string): Promise<User | null> {
    const [user] = await this.db
      .select()
      .from(schema.users)
      .where(eq(schema.users.id, id));
    return user ? new User(user) : null;
  }

  async createUser(
    createUserDto: CreateUserDto,
    hashedPassword,
  ): Promise<User> {
    const [newUser] = await this.db
      .insert(schema.users)
      .values({
        ...createUserDto,
        password: hashedPassword,
      })
      .returning();
    return new User(newUser);
  }

  async updateRefreshToken(
    userId: string,
    hashedRefreshToken: string | null,
  ): Promise<void> {
    await this.db
      .update(schema.users)
      .set({ hashedRefreshToken })
      .where(eq(schema.users.id, userId));
  }
}
