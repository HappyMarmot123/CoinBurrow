import { Exclude, Expose } from 'class-transformer';

// @Exclude(): 응답에서 제외할 필드
// @Expose(): 응답에 포함할 필드

export class User {
  @Expose()
  id: string;

  @Expose()
  username: string;

  @Expose()
  email: string;

  @Exclude()
  password?: string;

  @Exclude()
  hashedRefreshToken?: string | null;

  @Expose()
  createdAt: Date;

  constructor(partial: Partial<User>) {
    Object.assign(this, partial);
  }
}
