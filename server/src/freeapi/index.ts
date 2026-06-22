import { bybitAdapter } from "./adapters/bybit.js"
import { coingeckoAdapter } from "./adapters/coingecko.js"
import { coinpaprikaAdapter } from "./adapters/coinpaprika.js"
import type { IExchangeApiAdapter } from "./types.js"

export const freeApiProviders: Record<string, IExchangeApiAdapter> = {
  bybit: bybitAdapter,
  coingecko: coingeckoAdapter,
  coinpaprika: coinpaprikaAdapter,
}
