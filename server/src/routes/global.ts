import type { FastifyInstance } from 'fastify'

import { cachedWithStale } from '../freeapi/cache.js'
import { FreeApiError } from '../freeapi/errors.js'
import {
  GLOBAL_STALE_TTL_MS,
  GLOBAL_TTL_MS,
  fetchGlobalMarket,
} from '../global/provider.js'
import type { GlobalMarketResponse } from '../global/types.js'

function toDegradedResponse(reason: string): GlobalMarketResponse {
  return {
    provider: 'coingecko',
    totalMarketCapUsd: null,
    totalVolumeUsd: null,
    marketCapChangePct24h: null,
    btcDominance: null,
    ethDominance: null,
    activeCryptocurrencies: null,
    markets: null,
    fetchedAt: Date.now(),
    cacheTtlMs: GLOBAL_TTL_MS,
    stale: false,
    degraded: true,
    degradedReason: reason,
  }
}

export function registerGlobalRoutes(app: FastifyInstance): void {
  app.get('/market/global', async (_req, _reply) => {
    try {
      const cached = await cachedWithStale(
        'global:coingecko',
        GLOBAL_TTL_MS,
        GLOBAL_STALE_TTL_MS,
        () => fetchGlobalMarket(),
      )
      return { ...cached.value, stale: cached.stale }
    } catch (error) {
      if (error instanceof FreeApiError) {
        return toDegradedResponse(error.code)
      }
      throw error
    }
  })
}
