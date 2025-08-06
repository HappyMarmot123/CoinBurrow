import { Module } from '@nestjs/common';
import { UserModule } from './modules/user/user.module';
import { SharedModule } from './shared/shared.module';
import { AuthModule } from './modules/auth/auth.module';
import { ConfigModule } from '@nestjs/config';
import { DrizzleModule } from './core/database/drizzle.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    UserModule,
    AuthModule,
    SharedModule,
    DrizzleModule,
  ],
})
export class AppModule {}
