import { z } from 'zod'

import { FreeApiError } from '../freeapi/errors.js'
import { requestJson } from '../freeapi/http.js'
import { fetchExchangeRates } from '../upbit/upbitRest.js'
import type { FxResult } from './types.js'

export const FX_TTL_MS = 60 * 60 * 1000 // 1시간 fresh
export const FX_STALE_TTL_MS = 24 * 60 * 60 * 1000 // 24시간 stale 폴백

const ERAPI_URL = 'https://open.er-api.com/v6/latest/USD'

const erApiSchema = z.object({
  result: z.string(),
  rates: z.object({ KRW: z.number() }).passthrough(),
  time_next_update_unix: z.number().optional(),
})

async function fetchFromExchangeRateApi(): Promise<FxResult> {
  const payload = await requestJson(ERAPI_URL, erApiSchema, { timeoutMs: 4000 })
  if (payload.result !== 'success') {
    throw new FreeApiError('exchangerate-api non-success', 'UPSTREAM_ERROR', { retryable: false })
  }
  return {
    krw: payload.rates.KRW,
    source: 'exchangerate-api',
    fetchedAt: Date.now(),
    next: payload.time_next_update_unix,
  }
}

function extractUsdKrwFromUpbit(rows: Record<string, unknown>[]): number | null {
  for (const row of rows) {
    const currency = typeof row.currency === 'string' ? row.currency.toUpperCase() : ''
    const isUsd = currency === 'USD' || currency === 'USDKRW'
    if (!isUsd) continue
    const raw = row.base_price ?? row.rate
    const value = typeof raw === 'string' ? Number(raw) : typeof raw === 'number' ? raw : NaN
    if (Number.isFinite(value) && value > 0) return value
  }
  return null
}

async function fetchFromUpbit(): Promise<FxResult> {
  const rows = await fetchExchangeRates()
  const krw = extractUsdKrwFromUpbit(rows)
  if (krw === null) {
    throw new FreeApiError('upbit fx fallback empty', 'UPSTREAM_ERROR', { retryable: false })
  }
  return { krw, source: 'upbit', fetchedAt: Date.now() }
}

export async function fetchUsdKrw(): Promise<FxResult> {
  try {
    return await fetchFromExchangeRateApi()
  } catch (primaryError) {
    try {
      return await fetchFromUpbit()
    } catch {
      throw primaryError instanceof FreeApiError
        ? primaryError
        : new FreeApiError('fx unavailable', 'UPSTREAM_ERROR', { retryable: false })
    }
  }
}
