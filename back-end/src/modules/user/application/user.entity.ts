import { Exclude } from 'class-transformer';

export class User {
  id: string;
  username: string;

  @Exclude()
  password?: string;

  email: string;

  @Exclude()
  accessToken?: string;

  @Exclude()
  refreshToken?: string;

  createdAt: Date;

  constructor(partial: Partial<User>) {
    Object.assign(this, partial);
  }
}
