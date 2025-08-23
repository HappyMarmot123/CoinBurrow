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
import { CandleDto } from '../../application/candle.dto';
import { MarketQueryParams } from '../../application/exchange.dto';
import { parseUpbitError } from '@/shared/utils/parse-upbit-error';

@Injectable()
export class CandleService {
  private readonly logger = new Logger(CandleService.name);
  private readonly UNIT = 1;
  private readonly MAX_COUNT = 200;

  constructor(private readonly upbitApiService: UpbitApiService) {}

  async fetchCandles(
    market: MarketQueryParams['market'],
  ): Promise<CandleDto[]> {
    if (!market) {
      this.logger.warn('Market is required to fetch candles.');
      return [];
    }
    try {
      const response = await this.upbitApiService.instance.get<CandleDto[]>(
        `/candles/minutes/${this.UNIT}?market=${market}&count=${this.MAX_COUNT}`,
      );
      return response.data;
    } catch (error) {
      const { status, message } = parseUpbitError(
        error,
        `Candles for ${market}`,
      );
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
