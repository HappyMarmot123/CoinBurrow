import { Controller, Get } from '@nestjs/common';
import { MarketService } from './domain/services/market.service';
import { Market } from './application/market.dto';

@Controller('market')
export class MarketController {
  constructor(private readonly marketService: MarketService) {}

  @Get('all')
  async getMarkets(): Promise<Market[]> {
    return this.marketService.getMarkets();
  }
}
