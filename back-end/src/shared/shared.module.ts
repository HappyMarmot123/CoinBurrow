import { Module, Global } from '@nestjs/common';
import { EmailService } from './services/email.service';
import { UpbitApiService } from './services/upbit-api.service';
import { UpbitWebsocketService } from './services/upbit-websocket.service';

@Global()
@Module({
  providers: [EmailService, UpbitApiService, UpbitWebsocketService],
  exports: [EmailService, UpbitApiService, UpbitWebsocketService],
})
export class SharedModule {}
