import { IsIn } from 'class-validator';
import { TARGET_COINS } from '@/shared/constants/market.constants';

const SUPPORTED_MARKETS = TARGET_COINS.map((coin) => `KRW-${coin}`);

export class MarketQueryParams {
  @IsIn(SUPPORTED_MARKETS, {
    message: (args) =>
      `Invalid market. Supported markets are: ${SUPPORTED_MARKETS.join(', ')}`,
  })
  market:
    | 'KRW-BTC'
    | 'KRW-ETH'
    | 'KRW-XRP'
    | 'KRW-USDT'
    | 'KRW-SOL'
    | 'KRW-DOGE'
    | 'KRW-ADA'
    | 'KRW-TRX'
    | 'KRW-LINK'
    | 'KRW-XLM'
    | 'KRW-SUI'
    | 'KRW-AVAX'
    | 'KRW-APT';
}
