import type { FastifyInstance } from 'fastify'

import { cachedWithStale } from '../freeapi/cache.js'
import { FreeApiError } from '../freeapi/errors.js'
import type { KimchiUniverseResponse } from '../kimchi/types.js'
import {
  KIMCHI_UNIVERSE_STALE_TTL_MS,
  KIMCHI_UNIVERSE_TTL_MS,
  resolveKimchiUniverse,
} from '../kimchi/universe.js'

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
        () => resolveKimchiUniverse(),
      )
      const response: KimchiUniverseResponse = {
        items: cached.value,
        fetchedAt: Date.now(),
        cacheTtlMs: KIMCHI_UNIVERSE_TTL_MS,
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
