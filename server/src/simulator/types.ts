export const SUPPORTED_SYMBOLS = ['BTC', 'ETH'] as const

export type SimulatorSymbol = (typeof SUPPORTED_SYMBOLS)[number]
export type OrderSide = 'buy' | 'sell'

export interface MarketQuote {
  symbol: SimulatorSymbol
  price: number
  changeRate: number
}

export interface StoredPosition {
  symbol: SimulatorSymbol
  quantity: number
  avgPrice: number
}

export interface AccountSnapshot {
  accountId: string
  startingCash: number
  cashBalance: number
  positions: StoredPosition[]
  purchasedSymbols: SimulatorSymbol[]
}

export interface SimulatorPosition extends StoredPosition {
  currentPrice: number
  marketValue: number
  profit: number
  returnRate: number
}

export interface SimulatorAccountSummary {
  startingCash: number
  cashBalance: number
  investedValue: number
  totalAsset: number
  totalProfit: number
  returnRate: number
}

export interface SimulatorState {
  account: SimulatorAccountSummary
  positions: SimulatorPosition[]
  purchasedSymbols: SimulatorSymbol[]
  quotes: MarketQuote[]
  asOf: number
}

export interface ExecuteOrderInput {
  userId: string
  symbol: SimulatorSymbol
  side: OrderSide
  quantity: number
  price: number
}
