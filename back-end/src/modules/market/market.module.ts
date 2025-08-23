import { Module } from '@nestjs/common';
import { MarketController } from './market.controller';
import { MarketService } from './domain/services/market.service';
import { MarketGateway } from './application/gateways/market.gateway';

@Module({
  imports: [],
  controllers: [MarketController],
  providers: [MarketService, MarketGateway],
  exports: [MarketService],
})
export class MarketModule {}
