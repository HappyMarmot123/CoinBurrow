export type ExternalApiProvider = "binance" | "bybit" | "coingecko" | "coinpaprika"

export type ProviderCapability = "market" | "orderbook" | "kline" | "derivatives" | "meta"

export interface MarketSnapshot {
  symbol: string
  source: ExternalApiProvider
  lastPrice: string
  changeRate: string
  volume: string
  quoteVolume: string
  ts: number
}

export interface OrderBookSnapshot {
  symbol: string
  source: ExternalApiProvider
  bids: Array<[string, string]>
  asks: Array<[string, string]>
  lastUpdateTs: number
  depth: number
}

export interface KlineSnapshot {
  symbol: string
  source: ExternalApiProvider
  interval: string
  open: string
  high: string
  low: string
  close: string
  volume: string
  ts: number
}

export interface DerivativesSnapshot {
  symbol: string
  source: ExternalApiProvider
  fundingRate?: string
  openInterest?: string
  markPrice?: string
  ts: number
}

export interface CoinMeta {
  coinId: string
  name: string
  symbol: string
  logo?: string
  category?: string
  website?: string
  description?: string
  tags?: string[]
  whitepaper?: string
  recentEvents?: string[]
  team?: string[]
}

export interface IExchangeApiAdapter {
  name: ExternalApiProvider
  supports(capability: ProviderCapability): boolean
  fetchMarketSnapshot(symbols?: string[]): Promise<MarketSnapshot[]>
  fetchOrderBook(symbol: string, depth: number): Promise<OrderBookSnapshot>
  fetchKlines(symbol: string, interval: string, fromMs?: number, toMs?: number, limit?: number): Promise<KlineSnapshot[]>
  fetchDerivatives(symbol: string, category?: string): Promise<DerivativesSnapshot | null>
  fetchMeta(coinId: string): Promise<CoinMeta | null>
}
