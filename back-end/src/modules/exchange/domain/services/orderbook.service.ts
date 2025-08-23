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
import { OrderbookDto } from '../../application/orderbook.dto';
import { MarketQueryParams } from '../../application/exchange.dto';
import { parseUpbitError } from '@/shared/utils/parse-upbit-error';

@Injectable()
export class OrderbookService {
  private readonly logger = new Logger(OrderbookService.name);
  private readonly DEFAULT_COUNT = 12;

  constructor(private readonly upbitApiService: UpbitApiService) {}

  async fetchOrderbook(markets: MarketQueryParams[]): Promise<OrderbookDto[]> {
    if (!markets || markets.length === 0) {
      this.logger.warn('No markets provided to fetch orderbook.');
      return [];
    }
    try {
      const marketCodes = markets.map((m) => m.market).join(',');
      const response = await this.upbitApiService.instance.get<OrderbookDto[]>(
        `/orderbook?markets=${marketCodes}&count=${this.DEFAULT_COUNT}`,
      );
      return response.data;
    } catch (error) {
      const { status, message } = parseUpbitError(
        error,
        `Orderbook for ${markets.map((m) => m.market).join(', ')}`,
      );
      switch (status) {
        case 400:
        case 404: // Treat 404 as a client-side bad request
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
