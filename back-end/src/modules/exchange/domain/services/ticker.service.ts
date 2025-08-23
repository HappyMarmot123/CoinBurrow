import {
  Injectable,
  Logger,
  BadRequestException,
  BadGatewayException,
  InternalServerErrorException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { UpbitApiService } from '@/shared/services/upbit-api.service';
import { MarketService } from '@/modules/market/domain/services/market.service';
import { TickerDto } from '../../application/ticker.dto';
import { parseUpbitError } from '@/shared/utils/parse-upbit-error';

@Injectable()
export class TickerService {
  private readonly logger = new Logger(TickerService.name);

  constructor(
    private readonly upbitApiService: UpbitApiService,
    private readonly marketService: MarketService,
  ) {}

  async fetchTickers(): Promise<TickerDto[]> {
    try {
      let markets = await this.marketService.getMarkets();
      if (!markets || markets.length === 0) {
        this.logger.log('Cache miss for markets. Fetching from source.');
        markets = await (this.marketService as any).fetchAndCacheMarkets();
      }

      if (!markets || markets.length === 0) {
        this.logger.warn('No markets found to fetch tickers.');
        return [];
      }

      const marketCodes = markets.map((m) => m.market).join(',');
      const response = await this.upbitApiService.instance.get<TickerDto[]>(
        `/ticker?markets=${marketCodes}`,
      );
      return response.data;
    } catch (error) {
      const { status, message } = parseUpbitError(error, 'Tickers');
      switch (status) {
        case 400:
        case 404:
          throw new BadRequestException(message);
        case 429:
          throw new HttpException(message, HttpStatus.TOO_MANY_REQUESTS);
        case 500:
          throw new InternalServerErrorException(message);
        default:
          throw new BadGatewayException(message);
      }
    }
  }
}
