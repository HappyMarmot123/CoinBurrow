import { Module } from '@nestjs/common';
import { ExchangeController } from './exchange.controller';
import { TickerService } from './domain/services/ticker.service';
import { CandleService } from './domain/services/candle.service';
import { OrderbookService } from './domain/services/orderbook.service';
import { ExchangeGateway } from './application/gateways/exchange.gateway';
import { MarketModule } from '../market/market.module';

@Module({
  imports: [MarketModule],
  controllers: [ExchangeController],
  providers: [TickerService, CandleService, OrderbookService, ExchangeGateway],
})
export class ExchangeModule {}
