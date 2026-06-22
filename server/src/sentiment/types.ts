export type SentimentLabel = 'positive' | 'negative' | 'neutral'

export interface SentimentHistoryPoint {
  t: number // ms epoch
  value: number // 0~100
}

export interface SentimentResponse {
  provider: 'alternative.me'
  value: number | null
  classification?: string
  label: SentimentLabel | null
  updatedAt?: number
  nextUpdateInSec?: number | null
  history?: SentimentHistoryPoint[]
  fetchedAt: number
  cacheTtlMs: number
  stale: boolean
  degraded?: boolean
  degradedReason?: string
}
