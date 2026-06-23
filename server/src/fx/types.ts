export interface FxResult {
  krw: number
  source: 'exchangerate-api' | 'upbit'
  fetchedAt: number
  next?: number
}

export interface FxResponse {
  base: 'USD'
  krw: number | null
  source: 'exchangerate-api' | 'upbit' | null
  fetchedAt: number
  cacheTtlMs: number
  next?: number
  stale: boolean
  degraded?: boolean
  degradedReason?: string
}
