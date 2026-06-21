import type { FastifyInstance, FastifyReply } from 'fastify'
import { z } from 'zod'

import { config } from '../config.js'
import {
  UpbitError,
  fetchExchangeRates,
  fetchCandles,
  fetchMarkets,
  fetchAvailableQuotes,
  fetchMarketOverview,
  fetchMarketSummaries,
  fetchOrderbook,
  fetchMarketStatus,
  fetchTickers,
  fetchTradeTicks,
} from '../upbit/upbitRest.js'
import { normalizeMarkets, normalizeQuote } from '../upbit/normalize.js'

const candleQuerySchema = z.object({
  market: z.string().trim().min(1),
  timeframe: z.string().trim().optional(),
  count: z.coerce.number().int().min(1).max(200).default(200),
  to: z.string().trim().optional(),
})

const orderbookQuerySchema = z.object({
  market: z.string().trim().optional(),
  markets: z.string().trim().optional(),
  level: z.coerce.number().int().min(1).max(30).optional(),
}).refine((value) => !!value.market || !!value.markets, {
  message: 'market is required',
})

const tradeQuerySchema = z.object({
  market: z.string().trim().min(1),
  count: z.coerce.number().int().min(1).max(200).default(50),
  to: z.string().trim().optional(),
  daysAgo: z.coerce.number().int().min(1).max(7).optional(),
})

const marketsQuerySchema = z.object({
  markets: z.string().trim().min(1),
})

const marketListQuerySchema = z.object({
  quote: z.string().trim().optional(),
  isDetails: z.coerce.boolean().optional(),
})

const optionalMarketQuerySchema = z.object({
  markets: z.string().trim().optional(),
})

const upstreamErrorResponse = { error: 'upstream unavailable' } as const
const missingMarketErrorMessage = 'market is required'
const invalidMarketQueryMessage = 'invalid market query'
const marketsRequiredMessage = 'markets is required'

function replyValidationError(reply: FastifyReply, message: string) {
  return reply.code(400).send({ error: message })
}

async function withParsedQuery<TSchema extends z.ZodTypeAny>(
  reply: FastifyReply,
  query: unknown,
  schema: TSchema,
  invalidMessage: string,
  handler: (value: z.output<TSchema>) => Promise<unknown>,
): Promise<unknown> {
  const parsed = schema.safeParse(query)
  if (!parsed.success) {
    return replyValidationError(reply, invalidMessage)
  }

  return handler(parsed.data)
}

async function handleUpbitRequest<T>(
  reply: FastifyReply,
  request: () => Promise<T>,
): Promise<T | FastifyReply> {
  try {
    return await request()
  } catch (error) {
    if (!(error instanceof UpbitError)) {
      throw error
    }

    return reply.code(502).send(upstreamErrorResponse)
  }
}

export function registerMarketRoutes(app: FastifyInstance): void {
  app.get('/market/coin-list', async ({ query }, reply) =>
    withParsedQuery(
      reply,
      query,
      marketListQuerySchema,
      invalidMarketQueryMessage,
      ({ quote, isDetails }) =>
        handleUpbitRequest(reply, () =>
          fetchMarkets({
            quote: normalizeQuote(quote),
            isDetails: isDetails ?? false,
          }),
        ),
    ),
  )

  app.get('/market/exchange/quotes', async (_request, reply) =>
    handleUpbitRequest(reply, fetchAvailableQuotes),
  )

  app.get('/market/exchange/market-overview', ({ query }, reply) =>
    withParsedQuery(
      reply,
      query,
      marketsQuerySchema,
      marketsRequiredMessage,
      ({ markets }) =>
        handleUpbitRequest(reply, () => fetchMarketOverview(normalizeMarkets(markets))),
    ),
  )

  app.get('/market/exchange/markets', ({ query }, reply) =>
    withParsedQuery(
      reply,
      query,
      marketListQuerySchema,
      invalidMarketQueryMessage,
      ({ quote, isDetails }) =>
        handleUpbitRequest(reply, () =>
          fetchMarketSummaries({
            quote: normalizeQuote(quote),
            isDetails: isDetails ?? true,
          }),
        ),
    ),
  )

  app.get('/market/exchange/tickers', ({ query }, reply) =>
    withParsedQuery(
      reply,
      query,
      marketsQuerySchema,
      marketsRequiredMessage,
      ({ markets }) => handleUpbitRequest(reply, () => fetchTickers(normalizeMarkets(markets))),
    ),
  )

  app.get('/market/exchange/ticker', async (_request, reply) =>
    handleUpbitRequest(reply, () => fetchTickers([...config.targetCoins])),
  )

  app.get('/market/exchange/candle', (request, reply) =>
    withParsedQuery(
      reply,
      request.query,
      candleQuerySchema,
      missingMarketErrorMessage,
      ({ market, timeframe, count, to }) =>
        handleUpbitRequest(
          reply,
          () => fetchCandles(market, timeframe, count, to),
        ),
    ),
  )

  app.get('/market/exchange/orderbook', (request, reply) =>
    withParsedQuery(
      reply,
      request.query,
      orderbookQuerySchema,
      missingMarketErrorMessage,
      ({ markets, market, level }) =>
        handleUpbitRequest(
          reply,
          () => fetchOrderbook(normalizeMarkets(markets ?? market), level),
        ),
    ),
  )

  app.get('/market/exchange/trade-ticks', (request, reply) =>
    withParsedQuery(
      reply,
      request.query,
      tradeQuerySchema,
      missingMarketErrorMessage,
      ({ market, count, to, daysAgo }) =>
        handleUpbitRequest(
          reply,
          () => fetchTradeTicks(market, count, to, daysAgo),
        ),
    ),
  )

  app.get('/market/exchange/market-status', ({ query }, reply) =>
    withParsedQuery(
      reply,
      query,
      optionalMarketQuerySchema,
      invalidMarketQueryMessage,
      ({ markets }) => handleUpbitRequest(reply, () => fetchMarketStatus(normalizeMarkets(markets))),
    ),
  )

  app.get('/market/exchange/exchange-rates', async (_request, reply) =>
    handleUpbitRequest(reply, fetchExchangeRates),
  )
}
