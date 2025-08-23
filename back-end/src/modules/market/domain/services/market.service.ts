import { Injectable, Logger } from '@nestjs/common';
import { Market } from '../../application/market.dto';
import { UpbitApiService } from '@/shared/services/upbit-api.service';
import { TARGET_COINS } from '@/shared/constants/market.constants';

@Injectable()
export class MarketService {
  private readonly logger = new Logger(MarketService.name);

  constructor(private readonly upbitApiService: UpbitApiService) {}

  async getMarkets(): Promise<Market[]> {
    const targetMarkets = TARGET_COINS.map((coin) => `KRW-${coin}`);

    try {
      const allMarkets =
        await this.upbitApiService.instance.get<Market[]>(`/market/all`);
      if (allMarkets.status !== 200) {
        throw new Error('Failed to fetch all markets from Upbit');
      }
      const selectedMarkets = allMarkets.data.filter((market) =>
        targetMarkets.includes(market.market),
      );
      return selectedMarkets;
    } catch (error) {
      this.logger.error('Failed to fetch selected markets', error.stack);
      throw error;
    }
  }
}
