import { Exclude, Expose } from 'class-transformer';

// @Exclude(): 응답에서 제외할 필드
// @Expose(): 응답에 포함할 필드

export class User {
  id!: string;
  email!: string;

  @Exclude()
  password?: string | null;
  username!: string;

  @Exclude()
  hashedRefreshToken?: string | null;

  @Exclude()
  hashedMobileToken?: string | null;

  @Expose()
  createdAt!: Date;

  @Expose()
  updatedAt: Date;

  constructor(partial: Partial<User>) {
    Object.assign(this, partial);
  }
}
