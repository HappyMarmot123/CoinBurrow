import { Module, forwardRef } from '@nestjs/common';
import { MarketController } from './market.controller';
import { MarketService } from './domain/services/market.service';
import { MarketGateway } from './application/gateways/market.gateway';
import { MarketDataObservable } from './domain/services/market-data.observable';
import { MarketNotificationService } from './domain/services/market-notification.service';

@Module({
  imports: [],
  controllers: [MarketController],
  providers: [
    MarketService,
    MarketDataObservable,
    MarketNotificationService,
    MarketGateway,
  ],
  exports: [
    MarketService,
    MarketDataObservable,
    MarketNotificationService,
    MarketGateway,
  ],
})
export class MarketModule {}
