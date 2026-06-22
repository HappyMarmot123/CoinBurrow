import { request } from 'undici'
import type { z } from 'zod'

import { normalizeNewsFeed, parseFeedFetchedAt } from '../normalize.js'
import { rawNewsFeedSchema, rawNewsHealthSchema } from '../schemas.js'
import type {
  CryptoNewsHealth,
  CryptoNewsQuery,
  CryptoNewsResponse,
  CryptoNewsSourceSummary,
  RawNewsFeed,
} from '../types.js'

const BASE_URL = 'https://cryptocurrency.cv'
const PROVIDER = 'cryptocurrency.cv' as const
const REQUEST_TIMEOUT_MS = 3_000
const DEFAULT_CACHE_TTL_MS = 300_000
const DEFAULT_STALE_TTL_MS = 1_800_000
const ARTICLE_FETCH_WINDOW_LIMIT = 50
const DEFAULT_NEWS_SOURCES = [
  'TokenPost',
  'Block Media',
  'CoinDesk',
  'The Block',
  'Decrypt',
  'CoinTelegraph',
  'Bitcoin Magazine',
  'Blockworks',
] as const
const DEFAULT_NEWS_CATEGORIES = [
  'general',
  'bitcoin',
  'ethereum',
  'defi',
  'solana',
  'trading',
  'macro',
  'security',
] as const
const DEFAULT_NEWS_LANGUAGES = ['all', 'ko', 'en'] as const

export class CryptoNewsProviderError extends Error {
  readonly code: 'NETWORK_ERROR' | 'TIMEOUT' | 'RATE_LIMIT' | 'UPSTREAM_ERROR' | 'SCHEMA_MISMATCH'
  readonly statusCode?: number

  constructor(
    message: string,
    options: {
      code: CryptoNewsProviderError['code']
      cause?: unknown
      statusCode?: number
    },
  ) {
    super(message, { cause: options.cause })
    this.name = 'CryptoNewsProviderError'
    this.code = options.code
    this.statusCode = options.statusCode
  }
}

function getErrorCode(statusCode: number): CryptoNewsProviderError['code'] {
  if (statusCode === 429 || statusCode === 402) return 'RATE_LIMIT'
  if (statusCode >= 500) return 'UPSTREAM_ERROR'
  return 'UPSTREAM_ERROR'
}

async function requestJson<T>(
  path: string,
  schema: z.ZodType<T, z.ZodTypeDef, unknown>,
): Promise<T> {
  let response

  try {
    response = await request(`${BASE_URL}${path}`, {
      method: 'GET',
      headers: {
        accept: 'application/json',
        'user-agent': 'CoinBurrow/1.0 (+https://github.com/HappyMarmot123)',
      },
      bodyTimeout: REQUEST_TIMEOUT_MS,
      headersTimeout: REQUEST_TIMEOUT_MS,
    })
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : String(cause)
    throw new CryptoNewsProviderError('Crypto news request failed', {
      code: message.toLowerCase().includes('timeout') ? 'TIMEOUT' : 'NETWORK_ERROR',
      cause,
    })
  }

  const { body, statusCode } = response

  if (statusCode < 200 || statusCode >= 300) {
    try {
      await body.dump()
    } catch {
      // Ignore body cleanup failures.
    }

    throw new CryptoNewsProviderError(`Crypto news upstream returned ${statusCode}`, {
      code: getErrorCode(statusCode),
      statusCode,
    })
  }

  let json: unknown
  try {
    json = await body.json()
  } catch (cause) {
    throw new CryptoNewsProviderError('Crypto news response was not valid JSON', {
      code: 'SCHEMA_MISMATCH',
      cause,
    })
  }

  const parsed = schema.safeParse(json)
  if (!parsed.success) {
    throw new CryptoNewsProviderError('Crypto news response schema mismatch', {
      code: 'SCHEMA_MISMATCH',
      cause: parsed.error,
    })
  }

  return parsed.data
}

function parseCursorOffset(cursor: string | undefined): number {
  if (!cursor) return 0
  const parsed = Number(cursor)
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : 0
}

function buildPath(path: string, query: Record<string, string | number | undefined>): string {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && String(value).trim().length > 0) {
      params.set(key, String(value))
    }
  }
  const queryString = params.toString()
  return queryString ? `${path}?${queryString}` : path
}

async function fetchRawFeed(query: CryptoNewsQuery): Promise<RawNewsFeed> {
  const language = query.language === 'en' ? 'en' : 'ko'

  return requestJson(
    buildPath('/api/news/international', {
      language,
      limit: ARTICLE_FETCH_WINDOW_LIMIT,
      ...(query.category ? { category: query.category } : {}),
    }),
    rawNewsFeedSchema,
  )
}

export async function fetchCryptoCurrencyCvArticles(
  query: CryptoNewsQuery,
): Promise<CryptoNewsResponse> {
  const feed = await fetchRawFeed(query)
  const cursorOffset = parseCursorOffset(query.cursor)
  const normalizedArticles = normalizeNewsFeed(feed, query)
  const nextOffset = cursorOffset + query.limit
  const articles = normalizedArticles.slice(cursorOffset, nextOffset)
  const hasMore = normalizedArticles.length > nextOffset

  return {
    articles,
    ...(hasMore ? { nextCursor: String(nextOffset) } : {}),
    fetchedAt: parseFeedFetchedAt(feed),
    cacheTtlMs: DEFAULT_CACHE_TTL_MS,
    provider: PROVIDER,
    stale: false,
  }
}

export async function fetchCryptoCurrencyCvSources(): Promise<CryptoNewsSourceSummary> {
  return {
    provider: PROVIDER,
    sources: [...DEFAULT_NEWS_SOURCES],
    categories: [...DEFAULT_NEWS_CATEGORIES],
    languages: [...DEFAULT_NEWS_LANGUAGES],
    fetchedAt: Date.now(),
    cacheTtlMs: DEFAULT_CACHE_TTL_MS,
    stale: false,
    degraded: true,
    degradedReason: 'static metadata; upstream /api/news metadata is not on the request path',
  }
}

export async function fetchCryptoCurrencyCvHealth(): Promise<CryptoNewsHealth> {
  const startedAt = Date.now()
  const upstream = await requestJson('/api/health', rawNewsHealthSchema)
  const responseTimeMs = Date.now() - startedAt
  const statusValue = upstream.status
  const status = statusValue === 'healthy'
    ? 'healthy'
    : statusValue === 'degraded'
      ? 'degraded'
      : 'unavailable'

  return {
    provider: PROVIDER,
    status,
    checkedAt: Date.now(),
    responseTimeMs,
    upstream,
    cache: {
      ttlMs: DEFAULT_CACHE_TTL_MS,
      staleTtlMs: DEFAULT_STALE_TTL_MS,
    },
  }
}

export const cryptoNewsCachePolicy = {
  ttlMs: DEFAULT_CACHE_TTL_MS,
  staleTtlMs: DEFAULT_STALE_TTL_MS,
} as const
