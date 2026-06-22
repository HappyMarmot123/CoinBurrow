import type { FastifyInstance } from 'fastify'
import { z } from 'zod'

import { cachedWithStale } from '../freeapi/cache.js'
import { FreeApiError } from '../freeapi/errors.js'
import {
  SENTIMENT_STALE_TTL_MS,
  SENTIMENT_TTL_MS,
  fetchFearGreed,
} from '../sentiment/provider.js'
import type { SentimentResponse } from '../sentiment/types.js'

const sentimentQuerySchema = z.object({
  days: z.coerce.number().int().min(1).max(90).default(30),
})

function toDegradedResponse(reason: string): SentimentResponse {
  return {
    provider: 'alternative.me',
    value: null,
    label: null,
    fetchedAt: Date.now(),
    cacheTtlMs: SENTIMENT_TTL_MS,
    stale: false,
    degraded: true,
    degradedReason: reason,
  }
}

export function registerSentimentRoutes(app: FastifyInstance): void {
  app.get('/market/sentiment', async ({ query }, reply) => {
    const parsed = sentimentQuerySchema.safeParse(query)
    if (!parsed.success) {
      return reply.code(400).send({
        success: false,
        code: 'VALIDATION_ERROR',
        message: 'invalid sentiment query',
        timestamp: Date.now(),
      })
    }

    const { days } = parsed.data

    try {
      const cached = await cachedWithStale(
        `sentiment:fng:${days}`,
        SENTIMENT_TTL_MS,
        SENTIMENT_STALE_TTL_MS,
        () => fetchFearGreed(days),
      )
      return { ...cached.value, stale: cached.stale }
    } catch (error) {
      // 소프트 장애는 200 degraded로 — 패널이 graceful 표시(news 라우트와 동일 전략).
      if (error instanceof FreeApiError) {
        return toDegradedResponse(error.code)
      }
      throw error
    }
  })
}
