import { binanceAdapter } from "./adapters/binance.js"
import { bithumbAdapter } from "./adapters/bithumb.js"
import { bybitAdapter } from "./adapters/bybit.js"
import { coingeckoAdapter } from "./adapters/coingecko.js"
import { coinpaprikaAdapter } from "./adapters/coinpaprika.js"
import type { IExchangeApiAdapter } from "./types.js"

export const freeApiProviders: Record<string, IExchangeApiAdapter> = {
  binance: binanceAdapter,
  bybit: bybitAdapter,
  bithumb: bithumbAdapter,
  coingecko: coingeckoAdapter,
  coinpaprika: coinpaprikaAdapter,
}
