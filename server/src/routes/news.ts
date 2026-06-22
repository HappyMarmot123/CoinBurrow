import type { FastifyInstance, FastifyReply } from 'fastify'
import { z } from 'zod'

import { cachedWithStale } from '../news/cache.js'
import {
  CryptoNewsProviderError,
  cryptoNewsCachePolicy,
  fetchCryptoCurrencyCvArticles,
  fetchCryptoCurrencyCvHealth,
  fetchCryptoCurrencyCvSources,
} from '../news/providers/cryptocurrencyCv.js'
import type {
  CryptoNewsHealth,
  CryptoNewsQuery,
  CryptoNewsResponse,
  CryptoNewsSourceSummary,
} from '../news/types.js'

const newsQuerySchema = z.object({
  q: z.string().trim().max(120).optional(),
  asset: z
    .enum(['ALL', 'BTC', 'ETH', 'SOL', 'XRP', 'DOGE', 'ADA', 'DOT', 'TRX', 'DEFI'])
    .default('ALL'),
  category: z.string().trim().max(40).optional(),
  language: z.enum(['all', 'ko', 'en']).default('all'),
  source: z.string().trim().max(40).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  cursor: z.string().trim().max(200).optional(),
})

const validationError = {
  success: false,
  code: 'VALIDATION_ERROR',
  message: 'invalid news query',
} as const

function replyError(
  reply: FastifyReply,
  statusCode: number,
  code: string,
  message: string,
): FastifyReply {
  return reply.code(statusCode).send({
    success: false,
    code,
    message,
    timestamp: Date.now(),
  })
}

function getUpstreamStatus(error: CryptoNewsProviderError): number {
  if (error.code === 'RATE_LIMIT') return 502
  if (error.code === 'SCHEMA_MISMATCH') return 502
  if (error.code === 'TIMEOUT') return 502
  return 502
}

function getUpstreamMessage(error: CryptoNewsProviderError): string {
  if (error.code === 'RATE_LIMIT') return 'Crypto news upstream is rate limited or unavailable on the free tier'
  if (error.code === 'SCHEMA_MISMATCH') return 'Crypto news upstream response schema mismatch'
  if (error.code === 'TIMEOUT') return 'Crypto news upstream request timed out'
  return 'Crypto news upstream unavailable'
}

function stableQueryKey(query: CryptoNewsQuery): string {
  return [
    query.language,
    query.asset,
    query.category ?? '',
    query.source ?? '',
    query.q ?? '',
    String(query.limit),
    query.cursor ?? '',
  ].join('|')
}

function withStaleArticles(response: CryptoNewsResponse, stale: boolean): CryptoNewsResponse {
  return {
    ...response,
    stale,
    cacheTtlMs: cryptoNewsCachePolicy.ttlMs,
    articles: response.articles.map((article) => ({
      ...article,
      ...(stale ? { isStale: true } : {}),
    })),
  }
}

function toDegradedArticlesResponse(error: CryptoNewsProviderError): CryptoNewsResponse {
  return {
    articles: [],
    fetchedAt: Date.now(),
    cacheTtlMs: cryptoNewsCachePolicy.ttlMs,
    provider: 'cryptocurrency.cv',
    stale: false,
    degraded: true,
    degradedReason: getUpstreamMessage(error),
  }
}

function shouldReturnDegradedArticles(error: CryptoNewsProviderError): boolean {
  return (
    error.code === 'TIMEOUT'
    || error.code === 'RATE_LIMIT'
    || error.code === 'NETWORK_ERROR'
    || error.code === 'UPSTREAM_ERROR'
  )
}

function withStaleSources(
  response: CryptoNewsSourceSummary,
  stale: boolean,
): CryptoNewsSourceSummary {
  return {
    ...response,
    stale,
    cacheTtlMs: cryptoNewsCachePolicy.ttlMs,
  }
}

function withHealthCachePolicy(response: CryptoNewsHealth): CryptoNewsHealth {
  return {
    ...response,
    cache: {
      ttlMs: cryptoNewsCachePolicy.ttlMs,
      staleTtlMs: cryptoNewsCachePolicy.staleTtlMs,
    },
  }
}

function handleNewsError(reply: FastifyReply, error: unknown): FastifyReply {
  if (error instanceof CryptoNewsProviderError) {
    return replyError(reply, getUpstreamStatus(error), error.code, getUpstreamMessage(error))
  }

  throw error
}

export function registerNewsRoutes(app: FastifyInstance): void {
  app.get('/market/news/articles', async ({ query }, reply) => {
    const parsed = newsQuerySchema.safeParse(query)
    if (!parsed.success) {
      return reply.code(400).send({ ...validationError, timestamp: Date.now() })
    }

    const newsQuery = parsed.data

    try {
      const cached = await cachedWithStale(
        `articles:${stableQueryKey(newsQuery)}`,
        cryptoNewsCachePolicy.ttlMs,
        cryptoNewsCachePolicy.staleTtlMs,
        () => fetchCryptoCurrencyCvArticles(newsQuery),
      )

      return withStaleArticles(cached.value, cached.stale)
    } catch (error) {
      if (error instanceof CryptoNewsProviderError && shouldReturnDegradedArticles(error)) {
        return toDegradedArticlesResponse(error)
      }
      return handleNewsError(reply, error)
    }
  })

  app.get('/market/news/sources', async (_request, reply) => {
    try {
      const cached = await cachedWithStale(
        'sources',
        cryptoNewsCachePolicy.ttlMs,
        cryptoNewsCachePolicy.staleTtlMs,
        fetchCryptoCurrencyCvSources,
      )

      return withStaleSources(cached.value, cached.stale)
    } catch (error) {
      return handleNewsError(reply, error)
    }
  })

  app.get('/market/news/health', async (_request, reply) => {
    try {
      return withHealthCachePolicy(await fetchCryptoCurrencyCvHealth())
    } catch (error) {
      return handleNewsError(reply, error)
    }
  })
}
