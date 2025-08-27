import { Injectable, Logger } from '@nestjs/common';
import { UpbitApiService } from '@/shared/services/upbit-api.service';
import { TradeTick } from '../../application/ticks.dto';

@Injectable()
export class TradeTicksService {
  private readonly logger = new Logger(TradeTicksService.name);

  constructor(private readonly upbitApiService: UpbitApiService) {}

  async fetchTradeTicks(
    market: string,
    count: number = 10,
  ): Promise<TradeTick[]> {
    try {
      const response = await this.upbitApiService.instance.get<TradeTick[]>(
        `/trades/ticks?market=${market}&count=${count}`,
      );
      if (response.status !== 200) {
        throw new Error(
          `Failed to fetch trade ticks for ${market}: ${response.statusText}`,
        );
      }
      return response.data;
    } catch (error) {
      this.logger.error(
        `Error fetching trade ticks for ${market}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}
