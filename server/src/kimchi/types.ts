export interface KimchiUniverseItem {
  upbitMarket: string
  binanceSymbol: string
  base: string
  koreanName: string
  accTradePrice24h: number
}

export interface KimchiUniverseResponse {
  items: KimchiUniverseItem[]
  fetchedAt: number
  cacheTtlMs: number
  stale: boolean
  degraded?: boolean
  degradedReason?: string
}
