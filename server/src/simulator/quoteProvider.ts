import { fetchTickers } from '../upbit/upbitRest.js'
import { SimulatorDependencyError } from './errors.js'
import type { MarketQuote, SimulatorSymbol } from './types.js'

export interface SimulatorQuoteProvider {
  getQuotes(symbols: readonly SimulatorSymbol[]): Promise<MarketQuote[]>
}

export class UpbitSimulatorQuoteProvider implements SimulatorQuoteProvider {
  async getQuotes(symbols: readonly SimulatorSymbol[]): Promise<MarketQuote[]> {
    try {
      const tickers = await fetchTickers(symbols.map((symbol) => `KRW-${symbol}`))
      const byMarket = new Map(tickers.map((ticker) => [ticker.market, ticker]))

      return symbols.map((symbol) => {
        const ticker = byMarket.get(`KRW-${symbol}`)
        if (!ticker || !Number.isFinite(ticker.tradePrice) || ticker.tradePrice <= 0) {
          throw new SimulatorDependencyError(`${symbol} 현재가를 불러오지 못했습니다.`)
        }

        return {
          symbol,
          price: ticker.tradePrice,
          changeRate: ticker.signedChangeRate,
        }
      })
    } catch (error) {
      if (error instanceof SimulatorDependencyError) {
        throw error
      }
      throw new SimulatorDependencyError('현재가 공급자를 사용할 수 없습니다.', { cause: error })
    }
  }
}

