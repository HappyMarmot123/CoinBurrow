import type { FastifyInstance } from 'fastify'

import { cachedWithStale } from '../freeapi/cache.js'
import { FreeApiError } from '../freeapi/errors.js'
import type { KimchiUniverseResponse } from '../kimchi/types.js'
import {
  KIMCHI_UNIVERSE_STALE_TTL_MS,
  KIMCHI_UNIVERSE_TTL_MS,
  resolveKimchiUniverse,
} from '../kimchi/universe.js'
import { UpbitError } from '../upbit/upbitRest.js'

function toDegraded(reason: string): KimchiUniverseResponse {
  return {
    items: [],
    fetchedAt: Date.now(),
    cacheTtlMs: KIMCHI_UNIVERSE_TTL_MS,
    stale: false,
    degraded: true,
    degradedReason: reason,
  }
}

export function registerKimchiRoutes(app: FastifyInstance): void {
  app.get('/market/kimchi/universe', async () => {
    try {
      const cached = await cachedWithStale(
        'kimchi:universe',
        KIMCHI_UNIVERSE_TTL_MS,
        KIMCHI_UNIVERSE_STALE_TTL_MS,
        async () => ({ items: await resolveKimchiUniverse(), fetchedAt: Date.now() }),
      )
      const response: KimchiUniverseResponse = {
        items: cached.value.items,
        fetchedAt: cached.value.fetchedAt,
        cacheTtlMs: KIMCHI_UNIVERSE_TTL_MS,
        stale: cached.stale,
      }
      return response
    } catch (error) {
      // Soft upstream failures (Binance via FreeApiError, Upbit via UpbitError)
      // degrade gracefully to a 200 so the page shows a banner instead of erroring.
      if (error instanceof FreeApiError) {
        return toDegraded(error.code)
      }
      if (error instanceof UpbitError) {
        return toDegraded('UPSTREAM_ERROR')
      }
      throw error
    }
  })
}
