import { requestJson } from '../freeapi/http.js'
import { FreeApiError } from '../freeapi/errors.js'
import { globalResponseSchema } from './schemas.js'
import type { GlobalMarketResponse } from './types.js'

const GLOBAL_URL = 'https://api.coingecko.com/api/v3/global'
const PROVIDER = 'coingecko' as const

export const GLOBAL_TTL_MS = 60_000 // 60초
export const GLOBAL_STALE_TTL_MS = 30 * 60_000 // 30분

const COINGECKO_DEMO_API_KEY = process.env.COINGECKO_DEMO_API_KEY
  ?? process.env.X_CG_DEMO_API_KEY
  ?? process.env.CG_DEMO_API_KEY

function pickNumber(record: Record<string, number> | undefined, key: string): number | null {
  const value = record?.[key]
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function finiteOrNull(value: number | undefined): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

export async function fetchGlobalMarket(): Promise<GlobalMarketResponse> {
  const url = COINGECKO_DEMO_API_KEY
    ? `${GLOBAL_URL}?x_cg_demo_api_key=${encodeURIComponent(COINGECKO_DEMO_API_KEY)}`
    : GLOBAL_URL

  const payload = await requestJson(url, globalResponseSchema)
  const data = payload.data

  const totalMarketCapUsd = pickNumber(data.total_market_cap, 'usd')
  if (totalMarketCapUsd === null) {
    throw new FreeApiError('invalid global total_market_cap.usd', 'SCHEMA_MISMATCH', { retryable: false })
  }

  return {
    provider: PROVIDER,
    totalMarketCapUsd,
    totalVolumeUsd: pickNumber(data.total_volume, 'usd'),
    marketCapChangePct24h: finiteOrNull(data.market_cap_change_percentage_24h_usd),
    btcDominance: pickNumber(data.market_cap_percentage, 'btc'),
    ethDominance: pickNumber(data.market_cap_percentage, 'eth'),
    activeCryptocurrencies: finiteOrNull(data.active_cryptocurrencies),
    markets: finiteOrNull(data.markets),
    updatedAt: typeof data.updated_at === 'number' ? data.updated_at * 1000 : undefined,
    fetchedAt: Date.now(),
    cacheTtlMs: GLOBAL_TTL_MS,
    stale: false,
  }
}
