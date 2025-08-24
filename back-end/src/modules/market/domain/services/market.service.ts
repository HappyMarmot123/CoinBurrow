import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { Market } from '../../application/market.dto';
import { UpbitApiService } from '@/shared/services/upbit-api.service';
import { TARGET_COINS } from '@/shared/constants/market.constants';
import { Cache } from 'cache-manager';

@Injectable()
export class MarketService implements OnModuleInit {
  private readonly logger = new Logger(MarketService.name);

  constructor(
    private readonly upbitApiService: UpbitApiService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  async onModuleInit() {
    await this.fetchAndCacheMarkets();
  }

  @Cron('0 12,18 * * *') // 매일 12시와 18시에 실행
  async handleCron() {
    this.logger.log('Fetching and caching markets data');
    await this.fetchAndCacheMarkets();
  }

  async getMarkets(): Promise<Market[]> {
    const cachedMarkets = await this.cacheManager.get<Market[]>('markets');
    if (cachedMarkets) {
      // this.logger.log('Returning cached markets data');
      return cachedMarkets;
    }
    return this.fetchAndCacheMarkets();
  }

  private async fetchAndCacheMarkets(): Promise<Market[]> {
    const targetMarkets = TARGET_COINS.map((coin) => `KRW-${coin}`);
    try {
      const allMarkets = await this.upbitApiService.instance.get<Market[]>(
        `/market/all?is_details=true`,
      );
      if (allMarkets.status !== 200) {
        throw new Error('Failed to fetch all markets from Upbit');
      }
      const selectedMarkets = allMarkets.data.filter((market) =>
        targetMarkets.includes(market.market),
      );
      await this.cacheManager.set('markets', selectedMarkets);
      return selectedMarkets;
    } catch (error) {
      this.logger.error('Failed to fetch and cache markets', error.stack);
      throw error;
    }
  }
}
