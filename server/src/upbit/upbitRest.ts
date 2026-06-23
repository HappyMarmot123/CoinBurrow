import { request } from 'undici'
import { z } from 'zod'

import { config } from '../config.js'
import { cached, clearCache } from './cache.js'
import { normalizeMarkets, normalizeQuote } from './normalize.js'
import { enqueueUpbitRequest, resetUpbitRequestQueueForTest } from './requestQueue.js'
import type {
  CandleDto,
  MarketDto,
  MarketOverviewDto,
  QuoteSummaryDto,
  OrderbookDto,
  TickerDto,
  TradeDto,
} from './types.js'

export interface UpbitRateLimitSnapshot {
  raw: string
  group?: string
  sec?: number
}

export class UpbitError extends Error {
  readonly retryable: boolean
  readonly rateLimit?: UpbitRateLimitSnapshot

  constructor(
    message: string,
    options: ErrorOptions & {
      retryable?: boolean
      rateLimit?: UpbitRateLimitSnapshot
    } = {},
  ) {
    super(message, options)
    this.name = 'UpbitError'
    this.retryable = options.retryable ?? false
    this.rateLimit = options.rateLimit
  }
}

const marketSchema = z.array(
  z.object({
    market: z.string(),
    korean_name: z.string(),
    english_name: z.string(),
  }),
)

const tickerSchema = z.array(
  z.object({
    market: z.string(),
    trade_price: z.number(),
    signed_change_rate: z.number(),
    acc_trade_price_24h: z.number(),
    opening_price: z.number().optional(),
    high_price: z.number().optional(),
    low_price: z.number().optional(),
  }),
)

const candleSchema = z.array(
  z.object({
    market: z.string(),
    timestamp: z.number(),
    opening_price: z.number(),
    high_price: z.number(),
    low_price: z.number(),
    trade_price: z.number(),
    candle_acc_trade_volume: z.number(),
  }),
)

const orderbookSchema = z.array(
  z.object({
    market: z.string(),
    timestamp: z.number(),
    orderbook_units: z.array(
      z.object({
        ask_price: z.number(),
        bid_price: z.number(),
        ask_size: z.number(),
        bid_size: z.number(),
      }),
    ),
  }),
)

const tradeSchema = z.array(
  z.object({
    market: z.string(),
    trade_price: z.number(),
    trade_volume: z.number(),
    ask_bid: z.enum(['ASK', 'BID']),
    timestamp: z.number(),
  }),
)

const statusSchema = z.array(z.record(z.string(), z.unknown()))

const marketDetailsSchema = statusSchema

const exchangeRateSchema = z.array(z.record(z.string(), z.unknown()))
const marketSummarySchema = z.array(z.record(z.string(), z.unknown()))

const candleIntervalMap = {
  '1s': 'seconds/1',
  '1m': 'minutes/1',
  '3m': 'minutes/3',
  '5m': 'minutes/5',
  '10m': 'minutes/10',
  '15m': 'minutes/15',
  '30m': 'minutes/30',
  '60m': 'minutes/60',
  '240m': 'minutes/240',
  '1h': 'minutes/60',
  '4h': 'minutes/240',
  '1d': 'days',
  '1w': 'weeks',
  '1mo': 'months',
  '1y': 'years/1',
} as const

type CandleTimeframe = keyof typeof candleIntervalMap
type QueryValue = string | undefined
type UpbitRequestPriority = Parameters<typeof enqueueUpbitRequest>[1]

const MARKET_DETAILS_CACHE_KEY = 'market:all:details'
const MARKET_DETAILS_TTL_MS = 60_000
const EXCHANGE_RATE_CACHE_KEY = 'exchange-rates'
const EXCHANGE_RATE_TTL_MS = 30_000
const INITIAL_RETRY_DELAY_MS = 3_000
const RETRY_INTERVAL_MS = 2_000
const MAX_RETRY_ATTEMPTS = 2

export function clearUpbitCacheForTest(): void {
  clearCache()
  resetUpbitRequestQueueForTest()
}

function resolveCandlePath(timeframe?: string): string {
  if (!timeframe) {
    return candleIntervalMap['1m']
  }

  const normalized = timeframe.trim() === '1M' ? '1mo' : timeframe.trim().toLowerCase()
  if (normalized in candleIntervalMap) {
    const key = normalized as keyof typeof candleIntervalMap
    return candleIntervalMap[key]
  }

  throw new UpbitError(`Unsupported candle timeframe: ${timeframe}`)
}

function buildQueryString(overrides: Record<string, QueryValue>): string {
  const params = new URLSearchParams()

  for (const [key, value] of Object.entries(overrides)) {
    if (typeof value === 'string' && value.trim().length > 0) {
      params.set(key, value)
    }
  }

  return params.toString()
}

function buildPath(path: string, overrides: Record<string, QueryValue>): string {
  const query = buildQueryString(overrides)
  return query ? `${path}?${query}` : path
}

interface MarketFetchOptions {
  quote?: string
  isDetails?: boolean
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

function isRetryableStatus(statusCode: number): boolean {
  return statusCode === 429 || statusCode >= 500
}

function isRetryableUpbitError(error: unknown): boolean {
  return error instanceof UpbitError && error.retryable
}

function getHeaderValue(headers: unknown, name: string): string | undefined {
  if (!headers || typeof headers !== 'object') return undefined

  const record = headers as Record<string, string | string[] | number | undefined>
  const normalizedName = name.toLowerCase()
  const matchedKey = Object.keys(record).find(
    (key) => key.toLowerCase() === normalizedName,
  )
  const value = matchedKey ? record[matchedKey] : undefined

  if (Array.isArray(value)) {
    return value[0]
  }

  if (typeof value === 'number') {
    return String(value)
  }

  return value
}

export function parseRemainingReqHeader(raw: string | undefined): UpbitRateLimitSnapshot | null {
  if (!raw) return null

  const entries = new Map<string, string>()

  for (const part of raw.split(';')) {
    const [key, ...valueParts] = part.split('=')
    const value = valueParts.join('=').trim()

    const normalizedKey = key.trim().toLowerCase()

    if (normalizedKey.length > 0 && value.length > 0) {
      entries.set(normalizedKey, value)
    }
  }

  const secText = entries.get('sec')
  const secValue = secText === undefined || secText.length === 0
    ? undefined
    : Number(secText)
  const sec = typeof secValue === 'number' && Number.isFinite(secValue)
    ? secValue
    : undefined
  const group = entries.get('group')

  return {
    raw,
    group: group && group.length > 0 ? group : undefined,
    sec,
  }
}

function shouldLogRateLimit(statusCode: number, rateLimit: UpbitRateLimitSnapshot | null): boolean {
  return statusCode === 429 || (rateLimit?.sec !== undefined && rateLimit.sec <= 1)
}

function logRateLimitIfNeeded(
  path: string,
  statusCode: number,
  rateLimit: UpbitRateLimitSnapshot | null,
): void {
  if (!shouldLogRateLimit(statusCode, rateLimit)) return

  console.warn(
    `[upbit-rate-limit] path=${path} status=${statusCode} group=${rateLimit?.group ?? 'unknown'} sec=${rateLimit?.sec ?? 'unknown'} remainingReq="${rateLimit?.raw ?? 'missing'}"`,
  )
}

async function requestJsonOnce<T>(
  path: string,
  schema: z.ZodType<T>,
): Promise<T> {
  let response

  try {
    response = await request(`${config.upbitRestUrl}${path}`)
  } catch (cause) {
    throw new UpbitError('Upbit request failed', { cause, retryable: true })
  }

  const { body, headers, statusCode } = response
  const rateLimit = parseRemainingReqHeader(getHeaderValue(headers, 'remaining-req'))

  logRateLimitIfNeeded(path, statusCode, rateLimit)

  if (statusCode < 200 || statusCode >= 300) {
    try {
      await body.dump()
    } catch (cause) {
      throw new UpbitError('Upbit request failed', { cause, retryable: true })
    }

    throw new UpbitError(`Upbit ${path} -> ${statusCode}`, {
      rateLimit: rateLimit ?? undefined,
      retryable: isRetryableStatus(statusCode),
    })
  }

  try {
    return schema.parse(await body.json())
  } catch (cause) {
    throw new UpbitError(`Upbit ${path} -> invalid response`, { cause })
  }
}

async function getJson<T>(
  path: string,
  schema: z.ZodType<T>,
  priority: UpbitRequestPriority = 'normal',
): Promise<T> {
  let attempt = 0

  while (true) {
    try {
      return await enqueueUpbitRequest(
        () => requestJsonOnce(path, schema),
        priority,
      )
    } catch (error) {
      if (!isRetryableUpbitError(error) || attempt >= MAX_RETRY_ATTEMPTS) {
        throw error
      }

      attempt += 1
      await delay(attempt === 1 ? INITIAL_RETRY_DELAY_MS : RETRY_INTERVAL_MS)
    }
  }
}

function fetchMarketDetails(): Promise<Record<string, unknown>[]> {
  return cached(
    MARKET_DETAILS_CACHE_KEY,
    MARKET_DETAILS_TTL_MS,
    () => getJson('/market/all?isDetails=true', marketDetailsSchema, 'low'),
  )
}

export async function fetchMarkets(
  options: MarketFetchOptions = { isDetails: false, quote: 'KRW' },
): Promise<MarketDto[]> {
  const path = buildPath('/market/all', {
    isDetails: options.isDetails ? 'true' : 'false',
  })
  const markets = await getJson(path, marketSchema, 'normal')
  const quote = normalizeQuote(options.quote)

  return markets
    .filter(({ market }) => !quote || market.startsWith(`${quote}-`))
    .map(({ market, korean_name, english_name }) => ({
      market,
      koreanName: korean_name,
      englishName: english_name,
    }))
}

export async function fetchMarketSummaries(
  options: MarketFetchOptions = { isDetails: true },
): Promise<Record<string, unknown>[]> {
  const path = buildPath('/market/all', {
    isDetails: options.isDetails ? 'true' : undefined,
  })
  const markets = options.isDetails
    ? await fetchMarketDetails()
    : await getJson(path, marketSummarySchema, 'low')
  const quote = normalizeQuote(options.quote)

  return markets
    .filter((item) => typeof item.market === 'string' && (!quote || item.market.startsWith(`${quote}-`)))
    .filter((item) => {
      const koreanName = item.korean_name
      const englishName = item.english_name
      return typeof koreanName === 'string' && typeof englishName === 'string'
    })
    .map((item) => {
      const { korean_name, english_name, ...rest } = item
      return {
        ...rest,
        market: item.market,
        koreanName: korean_name,
        englishName: english_name,
        quote: String(item.market).split('-', 2)[0] ?? '',
      }
    })
}

export async function fetchTickers(markets: string[]): Promise<TickerDto[]> {
  const path = `/ticker?markets=${markets.map(encodeURIComponent).join(',')}`
  const tickers = await getJson(path, tickerSchema, 'high')

  return tickers.map(
    ({
      market,
      trade_price,
      signed_change_rate,
      acc_trade_price_24h,
      opening_price,
      high_price,
      low_price,
    }) => ({
      market,
      tradePrice: trade_price,
      signedChangeRate: signed_change_rate,
      accTradePrice24h: acc_trade_price_24h,
      openingPrice: opening_price,
      highPrice: high_price,
      lowPrice: low_price,
    }),
  )
}

export async function fetchCandles(
  market: string,
  timeframeOrCount?: string | number,
  count = 200,
  to?: string,
): Promise<CandleDto[]> {
  const timeframe = typeof timeframeOrCount === 'number'
    ? '1m'
    : timeframeOrCount ?? '1m'
  const resolvedCount = typeof timeframeOrCount === 'number' ? timeframeOrCount : count

  const candlePath = resolveCandlePath(timeframe)
  const path = buildPath(`/candles/${candlePath}`, {
    market,
    count: String(resolvedCount),
    to,
  })
  const candles = await getJson(path, candleSchema, 'critical')

  return candles.map(
    ({
      market: candleMarket,
      timestamp,
      opening_price,
      high_price,
      low_price,
      trade_price,
      candle_acc_trade_volume,
    }) => ({
      market: candleMarket,
      timestamp,
      open: opening_price,
      high: high_price,
      low: low_price,
      close: trade_price,
      volume: candle_acc_trade_volume,
    }),
  )
}

export async function fetchOrderbook(
  markets: string[],
  level?: number,
): Promise<OrderbookDto[]> {
  const normalizedMarkets = normalizeMarkets(markets)
  const path = buildPath('/orderbook', {
    markets: normalizedMarkets.join(','),
    level: typeof level === 'number' ? String(level) : undefined,
  })

  const orderbooks = await getJson(
    path,
    orderbookSchema,
    'high',
  )

  return orderbooks.map(({ market: orderbookMarket, timestamp, orderbook_units }) => ({
    market: orderbookMarket,
    timestamp,
    units: orderbook_units.map(
      ({ ask_price, bid_price, ask_size, bid_size }) => ({
        askPrice: ask_price,
        bidPrice: bid_price,
        askSize: ask_size,
        bidSize: bid_size,
      }),
    ),
  }))
}

export async function fetchTradeTicks(
  market: string,
  count = 50,
  to?: string,
  daysAgo?: number,
): Promise<TradeDto[]> {
  const path = buildPath('/trades/ticks', {
    market,
    count: String(count),
    to,
    daysAgo: typeof daysAgo === 'number' ? String(daysAgo) : undefined,
  })
  const trades = await getJson(path, tradeSchema, 'high')

  return trades.map(
    ({ market: tradeMarket, trade_price, trade_volume, ask_bid, timestamp }) => ({
      market: tradeMarket,
      price: trade_price,
      volume: trade_volume,
      side: ask_bid,
      timestamp,
    }),
  )
}

export async function fetchMarketStatus(markets?: string[]): Promise<Record<string, unknown>[]> {
  const allMarkets = await fetchMarketDetails()
  const normalized = normalizeMarkets(markets ?? [])

  if (normalized.length === 0) {
    return allMarkets
  }

  const byMarket = new Map<string, Record<string, unknown>>()

  for (const marketItem of allMarkets) {
    const market = marketItem.market
    if (typeof market === 'string') {
      byMarket.set(market.toUpperCase(), marketItem)
    }
  }

  const result: Record<string, unknown>[] = []

  for (const market of normalized) {
    const status = byMarket.get(market)
    if (status) {
      result.push(status)
    }
  }

  return result
}

export async function fetchExchangeRates(): Promise<Record<string, unknown>[]> {
  return cached(EXCHANGE_RATE_CACHE_KEY, EXCHANGE_RATE_TTL_MS, async () => {
    const paths = ['/exchange-rates', '/exchange-rate']

    for (const path of paths) {
      try {
        return await getJson(path, exchangeRateSchema, 'low')
      } catch {
        // Try fallback endpoint.
      }
    }

    return []
  })
}

export async function fetchAvailableQuotes(): Promise<QuoteSummaryDto[]> {
  const markets = await fetchMarketSummaries({ isDetails: true })
  const quoteCounts = new Map<string, number>()

  markets.forEach((item) => {
    const market = typeof item.market === 'string' ? item.market : String(item.market)
    const [quote] = market.split('-', 2)
    if (quote) {
      quoteCounts.set(quote, (quoteCounts.get(quote) ?? 0) + 1)
    }
  })

  return [...quoteCounts.entries()]
    .sort(([quoteA, countA], [quoteB, countB]) => {
      if (countB !== countA) {
        return countB - countA
      }

      if (quoteA === 'KRW' && quoteB !== 'KRW') {
        return -1
      }

      if (quoteB === 'KRW' && quoteA !== 'KRW') {
        return 1
      }

      return quoteA.localeCompare(quoteB)
    })
    .map(([quote, marketCount]) => ({ quote, marketCount }))
}

export async function fetchMarketOverview(markets: string[]): Promise<MarketOverviewDto[]> {
  const normalized = normalizeMarkets(markets)

  if (normalized.length === 0) {
    return []
  }

  const tickers = await fetchTickers(normalized)
  const orderbooks = await fetchOrderbook(normalized)
  const statuses = await fetchMarketStatus(normalized)

  const tickerByMarket = new Map(tickers.map((ticker) => [ticker.market, ticker]))
  const orderbookByMarket = new Map(orderbooks.map((orderbook) => [orderbook.market, orderbook]))
  const statusByMarket = new Map(
    statuses
      .map((status) => {
        const market =
          typeof status.market === 'string'
            ? status.market
            : typeof status.code === 'string'
              ? status.code
              : undefined
        return market
          ? [market, status]
          : null
      })
      .filter((entry): entry is [string, Record<string, unknown>] => entry !== null),
  )

  return normalized.map((market) => ({
    market,
    ticker: tickerByMarket.get(market) ?? null,
    orderbook: orderbookByMarket.get(market) ?? null,
    status: statusByMarket.get(market) ?? null,
  }))
}
