import { Module } from '@nestjs/common';
import { ExchangeController } from './exchange.controller';
import { TickerService } from './domain/services/ticker.service';
import { CandleService } from './domain/services/candle.service';
import { OrderbookService } from './domain/services/orderbook.service';
import { ExchangeGateway } from './application/gateways/exchange.gateway';
import { MarketModule } from '../market/market.module';
import { TradeTicksService } from './domain/services/trade-ticks.service';

@Module({
  imports: [MarketModule],
  controllers: [ExchangeController],
  providers: [
    TickerService,
    CandleService,
    OrderbookService,
    TradeTicksService,
    ExchangeGateway,
  ],
})
export class ExchangeModule {}
