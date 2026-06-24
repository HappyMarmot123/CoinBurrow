export interface GlobalMarketResponse {
  provider: 'coingecko'
  totalMarketCapUsd: number | null
  totalVolumeUsd: number | null
  marketCapChangePct24h: number | null
  btcDominance: number | null
  ethDominance: number | null
  activeCryptocurrencies: number | null
  markets: number | null
  updatedAt?: number
  fetchedAt: number
  cacheTtlMs: number
  stale: boolean
  degraded?: boolean
  degradedReason?: string
}
