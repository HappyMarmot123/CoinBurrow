import type { FastifyInstance } from 'fastify'

import { cachedWithStale } from '../freeapi/cache.js'
import { FreeApiError } from '../freeapi/errors.js'
import { FX_STALE_TTL_MS, FX_TTL_MS, fetchUsdKrw } from '../fx/provider.js'
import type { FxResponse } from '../fx/types.js'

function toDegraded(reason: string): FxResponse {
  return {
    base: 'USD',
    krw: null,
    source: null,
    fetchedAt: Date.now(),
    cacheTtlMs: FX_TTL_MS,
    stale: false,
    degraded: true,
    degradedReason: reason,
  }
}

export function registerFxRoutes(app: FastifyInstance): void {
  app.get('/market/fx', async () => {
    try {
      const cached = await cachedWithStale('fx:usdkrw', FX_TTL_MS, FX_STALE_TTL_MS, fetchUsdKrw)
      const response: FxResponse = {
        base: 'USD',
        krw: cached.value.krw,
        source: cached.value.source,
        fetchedAt: cached.value.fetchedAt,
        cacheTtlMs: FX_TTL_MS,
        next: cached.value.next,
        stale: cached.stale,
      }
      return response
    } catch (error) {
      if (error instanceof FreeApiError) {
        return toDegraded(error.code)
      }
      throw error
    }
  })
}
