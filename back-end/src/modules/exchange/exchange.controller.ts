import { Controller, Get, Query } from '@nestjs/common';
import { TickerService } from './domain/services/ticker.service';
import { CandleService } from './domain/services/candle.service';
import { OrderbookService } from './domain/services/orderbook.service';
import { MarketQueryParams } from './application/exchange.dto';

@Controller('market/exchange')
export class ExchangeController {
  constructor(
    private readonly tickerService: TickerService,
    private readonly candleService: CandleService,
    private readonly orderbookService: OrderbookService,
  ) {}

  @Get('ticker')
  async getTicker() {
    const tickers = await this.tickerService.fetchTickers();
    return tickers;
  }

  @Get('candle')
  async getCandle(@Query('market') market: MarketQueryParams['market']) {
    return this.candleService.fetchCandles(market);
  }

  @Get('orderbook')
  async getOrderbook(@Query('market') market: MarketQueryParams['market']) {
    return await this.orderbookService.fetchOrderbook(market);
  }
}
