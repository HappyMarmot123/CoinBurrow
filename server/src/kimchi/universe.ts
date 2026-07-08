import { fetchMarkets, fetchTickers } from '../upbit/upbitRest.js'
import { fetchBinanceUsdtBases } from './binanceSymbols.js'
import type { KimchiUniverseItem } from './types.js'

export const KIMCHI_UNIVERSE_LIMIT = 30
export const KIMCHI_UNIVERSE_TTL_MS = 3 * 60 * 1000 // 3분
export const KIMCHI_UNIVERSE_STALE_TTL_MS = 30 * 60 * 1000 // 30분

function baseOf(market: string): string {
  return (market.split('-', 2)[1] ?? '').toUpperCase()
}

export async function resolveKimchiUniverse(
  limit: number = KIMCHI_UNIVERSE_LIMIT,
): Promise<KimchiUniverseItem[]> {
  const [markets, binanceBases] = await Promise.all([
    fetchMarkets({ quote: 'KRW' }),
    fetchBinanceUsdtBases(),
  ])

  const krwMarkets = markets.map((market) => market.market)
  if (krwMarkets.length === 0) return []

  const tickers = await fetchTickers(krwMarkets)
  const volumeByMarket = new Map(tickers.map((ticker) => [ticker.market, ticker.accTradePrice24h]))

  return markets
    .map((market) => {
      const base = baseOf(market.market)
      return {
        upbitMarket: market.market,
        binanceSymbol: `${base}USDT`,
        base,
        koreanName: market.koreanName,
        accTradePrice24h: volumeByMarket.get(market.market) ?? 0,
      }
    })
    .filter((item) => item.base.length > 0 && binanceBases.has(item.base))
    .sort((a, b) => b.accTradePrice24h - a.accTradePrice24h)
    .slice(0, limit)
}
