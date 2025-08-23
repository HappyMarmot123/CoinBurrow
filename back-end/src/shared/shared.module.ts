import { Module, Global } from '@nestjs/common';
import { EmailService } from './services/email.service';
import { UpbitApiService } from './services/upbit-api.service';

@Global()
@Module({
  providers: [EmailService, UpbitApiService],
  exports: [EmailService, UpbitApiService],
})
export class SharedModule {}
