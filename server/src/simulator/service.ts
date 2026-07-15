import type { SimulatorQuoteProvider } from './quoteProvider.js'
import type { SimulatorRepository } from './repository.js'
import {
  SUPPORTED_SYMBOLS,
  type AccountSnapshot,
  type MarketQuote,
  type OrderSide,
  type SimulatorState,
  type SimulatorSymbol,
} from './types.js'

function round(value: number, digits = 2): number {
  const factor = 10 ** digits
  return Math.round((value + Number.EPSILON) * factor) / factor
}

export function buildSimulatorState(
  snapshot: AccountSnapshot,
  quotes: MarketQuote[],
  asOf = Date.now(),
): SimulatorState {
  const quoteBySymbol = new Map(quotes.map((quote) => [quote.symbol, quote]))
  const positions = snapshot.positions.map((position) => {
    const quote = quoteBySymbol.get(position.symbol)
    if (!quote) {
      throw new Error(`Missing quote for ${position.symbol}`)
    }

    const marketValue = round(position.quantity * quote.price)
    const cost = position.quantity * position.avgPrice
    const profit = round(marketValue - cost)

    return {
      ...position,
      currentPrice: quote.price,
      marketValue,
      profit,
      returnRate: cost > 0 ? round((profit / cost) * 100, 4) : 0,
    }
  })

  const investedValue = round(positions.reduce((total, position) => total + position.marketValue, 0))
  const totalAsset = round(snapshot.cashBalance + investedValue)
  const totalProfit = round(totalAsset - snapshot.startingCash)

  return {
    account: {
      startingCash: snapshot.startingCash,
      cashBalance: snapshot.cashBalance,
      investedValue,
      totalAsset,
      totalProfit,
      returnRate: snapshot.startingCash > 0
        ? round((totalProfit / snapshot.startingCash) * 100, 4)
        : 0,
    },
    positions,
    purchasedSymbols: snapshot.purchasedSymbols,
    quotes,
    asOf,
  }
}

export class SimulatorService {
  constructor(
    private readonly repository: SimulatorRepository,
    private readonly quoteProvider: SimulatorQuoteProvider,
  ) {}

  async getQuotes(symbols: readonly SimulatorSymbol[]): Promise<MarketQuote[]> {
    return this.quoteProvider.getQuotes(symbols)
  }

  async getState(userId: string): Promise<SimulatorState> {
    const [snapshot, quotes] = await Promise.all([
      this.repository.getSnapshot(userId),
      this.quoteProvider.getQuotes(SUPPORTED_SYMBOLS),
    ])
    return buildSimulatorState(snapshot, quotes)
  }

  async executeOrder(input: {
    userId: string
    symbol: SimulatorSymbol
    side: OrderSide
    quantity: number
  }): Promise<SimulatorState> {
    const quotes = await this.quoteProvider.getQuotes(SUPPORTED_SYMBOLS)
    const quote = quotes.find((item) => item.symbol === input.symbol)
    if (!quote) {
      throw new Error(`Missing quote for ${input.symbol}`)
    }

    await this.repository.executeOrder({ ...input, price: quote.price })
    const snapshot = await this.repository.getSnapshot(input.userId)
    return buildSimulatorState(snapshot, quotes)
  }

  async reset(userId: string): Promise<SimulatorState> {
    await this.repository.reset(userId)
    return this.getState(userId)
  }
}
