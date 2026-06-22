import { request } from 'undici'
import { z } from 'zod'

import { config } from '../config.js'
import { createNormalizedError, type NormalizedError } from '../shared/validation/error/normalized-error.js'
import type { NormalizedErrorCode } from '../shared/validation/error/code.js'
import { parseWithSchema } from '../shared/validation/parse.js'
import type {
  CandleDto,
  MarketDto,
  OrderbookDto,
  TickerDto,
  TradeDto,
} from './types.js'

interface UpbitErrorOptions extends ErrorOptions {
  normalizedError?: NormalizedError
  code?: NormalizedErrorCode
}

export class UpbitError extends Error {
  readonly normalizedError: NormalizedError

  constructor(message: string, options: UpbitErrorOptions = {}) {
    super(message, { cause: options.cause })
    this.name = 'UpbitError'
    this.normalizedError =
      options.normalizedError ??
      createNormalizedError({
        source: 'http',
        code: options.code ?? 'UPSTREAM_ERROR',
        message: 'Upstream request failed',
        provider: 'upbit',
      })
  }
}

const marketSchema = z.array(
  z
    .object({
      market: z.string(),
      korean_name: z.string(),
      english_name: z.string(),
    })
    .passthrough(),
)

const tickerSchema = z.array(
  z
    .object({
      market: z.string(),
      trade_price: z.number(),
      signed_change_rate: z.number(),
      acc_trade_price_24h: z.number(),
    })
    .passthrough(),
)

const candleSchema = z.array(
  z
    .object({
      market: z.string(),
      timestamp: z.number(),
      opening_price: z.number(),
      high_price: z.number(),
      low_price: z.number(),
      trade_price: z.number(),
      candle_acc_trade_volume: z.number(),
    })
    .passthrough(),
)

const orderbookSchema = z.array(
  z
    .object({
      market: z.string(),
      timestamp: z.number(),
      orderbook_units: z.array(
        z
          .object({
            ask_price: z.number(),
            bid_price: z.number(),
            ask_size: z.number(),
            bid_size: z.number(),
          })
          .passthrough(),
      ),
    })
    .passthrough(),
)

const tradeSchema = z.array(
  z
    .object({
      market: z.string(),
      trade_price: z.number(),
      trade_volume: z.number(),
      ask_bid: z.enum(['ASK', 'BID']),
      timestamp: z.number(),
    })
    .passthrough(),
)

async function getJson<T>(
  path: string,
  schema: z.ZodType<T>,
): Promise<T> {
  let response

  try {
    response = await request(`${config.upbitRestUrl}${path}`)
  } catch (cause) {
    throw new UpbitError('Upbit request failed', {
      cause,
      normalizedError: createNormalizedError({
        source: 'http',
        code: 'NETWORK_ERROR',
        message: 'Upstream network request failed',
        detail: cause instanceof Error ? { name: cause.name } : undefined,
        provider: 'upbit',
      }),
    })
  }

  const { body, statusCode } = response

  if (statusCode < 200 || statusCode >= 300) {
    try {
      await body.dump()
    } catch (cause) {
      throw new UpbitError('Upbit request failed', {
        cause,
        normalizedError: createNormalizedError({
          source: 'http',
          code: 'NETWORK_ERROR',
          message: 'Upstream response cleanup failed',
          detail: cause instanceof Error ? { name: cause.name } : undefined,
          provider: 'upbit',
        }),
      })
    }

    const code = statusCode === 429 ? 'RATE_LIMIT' : 'UPSTREAM_ERROR'
    throw new UpbitError(`Upbit ${path} -> ${statusCode}`, {
      normalizedError: createNormalizedError({
        source: 'http',
        code,
        message: code === 'RATE_LIMIT' ? 'Upstream rate limit exceeded' : 'Upstream request failed',
        detail: { statusCode },
        provider: 'upbit',
      }),
    })
  }

  let payload: unknown

  try {
    payload = await body.json()
  } catch (cause) {
    throw new UpbitError(`Upbit ${path} -> invalid response`, {
      cause,
      normalizedError: createNormalizedError({
        source: 'http',
        code: 'SCHEMA_MISMATCH',
        message: 'Upstream response was not valid JSON',
        detail: cause instanceof Error ? { name: cause.name, message: cause.message } : undefined,
        provider: 'upbit',
      }),
    })
  }

  const parsed = parseWithSchema(schema, payload, 'http')
  if (!parsed.ok) {
    throw new UpbitError(`Upbit ${path} -> invalid response`, {
      normalizedError: createNormalizedError({
        source: 'http',
        code: 'SCHEMA_MISMATCH',
        message: 'Upstream response schema mismatch',
        detail: parsed.error.detail,
        path: parsed.error.path,
        provider: 'upbit',
      }),
    })
  }

  return parsed.data
}

export async function fetchMarkets(): Promise<MarketDto[]> {
  const markets = await getJson('/market/all?isDetails=false', marketSchema)

  return markets
    .filter(({ market }) => market.startsWith('KRW-'))
    .map(({ market, korean_name, english_name }) => ({
      market,
      koreanName: korean_name,
      englishName: english_name,
    }))
}

export async function fetchTickers(markets: string[]): Promise<TickerDto[]> {
  const path = `/ticker?markets=${markets.map(encodeURIComponent).join(',')}`
  const tickers = await getJson(path, tickerSchema)

  return tickers.map(
    ({
      market,
      trade_price,
      signed_change_rate,
      acc_trade_price_24h,
    }) => ({
      market,
      tradePrice: trade_price,
      signedChangeRate: signed_change_rate,
      accTradePrice24h: acc_trade_price_24h,
    }),
  )
}

export async function fetchCandles(
  market: string,
  count = 200,
): Promise<CandleDto[]> {
  const path = `/candles/minutes/1?market=${encodeURIComponent(market)}&count=${count}`
  const candles = await getJson(path, candleSchema)

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
  market: string,
): Promise<OrderbookDto[]> {
  const orderbooks = await getJson(
    `/orderbook?markets=${encodeURIComponent(market)}`,
    orderbookSchema,
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
): Promise<TradeDto[]> {
  const path = `/trades/ticks?market=${encodeURIComponent(market)}&count=${count}`
  const trades = await getJson(path, tradeSchema)

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
