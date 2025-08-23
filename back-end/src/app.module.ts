import { Module } from '@nestjs/common';
import { UserModule } from './modules/user/user.module';
import { SharedModule } from './shared/shared.module';
import { AuthModule } from './modules/auth/auth.module';
import { ConfigModule } from '@nestjs/config';
import { DrizzleModule } from './core/database/drizzle.module';
import { configuration } from './config/configuration';
import { MarketModule } from './modules/market/market.module';
import { ScheduleModule } from '@nestjs/schedule';
import { CacheModule } from '@nestjs/cache-manager';
import { ExchangeModule } from './modules/exchange/exchange.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    ScheduleModule.forRoot(),
    CacheModule.register({ isGlobal: true }),
    UserModule,
    AuthModule,
    SharedModule,
    DrizzleModule,
    MarketModule,
    ExchangeModule,
  ],
})
export class AppModule {}
