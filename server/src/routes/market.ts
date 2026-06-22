import type { FastifyInstance, FastifyReply } from 'fastify'
import { z, type ZodType } from 'zod'

import { config } from '../config.js'
import { createNormalizedError, type NormalizedError } from '../shared/validation/error/normalized-error.js'
import { parseWithSchema } from '../shared/validation/parse.js'
import {
  type ApiSuccessEnvelope,
  toApiError,
  toApiSuccess,
} from '../shared/validation/schemas/api/api-envelope.js'
import {
  candleDtoListSchema,
  marketDtoListSchema,
  orderbookDtoListSchema,
  tickerDtoListSchema,
  tradeDtoListSchema,
} from '../shared/validation/schemas/domain/market.js'
import {
  UpbitError,
  fetchCandles,
  fetchMarkets,
  fetchOrderbook,
  fetchTickers,
  fetchTradeTicks,
} from '../upbit/upbitRest.js'

const marketQuerySchema = z.object({
  market: z.string().trim().min(1),
})

function sendError(reply: FastifyReply, error: NormalizedError, statusCode = statusCodeFor(error)): FastifyReply {
  return reply.code(statusCode).send(toApiError(error))
}

function statusCodeFor(error: NormalizedError): number {
  if (error.code === 'VALIDATION_ERROR') return 400
  if (error.code === 'RATE_LIMIT') return 502
  if (error.code === 'SCHEMA_MISMATCH') return error.source === 'internal' ? 500 : 502
  return 502
}

async function handleUpbitRequest<T>(
  reply: FastifyReply,
  request: () => Promise<T>,
  responseSchema: ZodType<T>,
): Promise<ApiSuccessEnvelope<T> | FastifyReply> {
  try {
    const data = await request()
    const parsed = parseWithSchema(responseSchema, data, 'internal')

    if (!parsed.ok) {
      return sendError(reply, parsed.error, 500)
    }

    return toApiSuccess(parsed.data)
  } catch (error) {
    if (!(error instanceof UpbitError)) {
      throw error
    }

    return sendError(reply, error.normalizedError)
  }
}

function registerMarketQueryRoute<T>(
  app: FastifyInstance,
  path: string,
  request: (market: string) => Promise<T>,
  responseSchema: ZodType<T>,
): void {
  app.get(path, async (fastifyRequest, reply) => {
    const query = parseWithSchema(marketQuerySchema, fastifyRequest.query, 'http')

    if (!query.ok) {
      return sendError(
        reply,
        createNormalizedError({
          source: 'http',
          code: 'VALIDATION_ERROR',
          message: 'market is required',
          detail: query.error.detail,
          path: query.error.path,
          retryable: false,
        }),
      )
    }

    return handleUpbitRequest(reply, () => request(query.data.market), responseSchema)
  })
}

export function registerMarketRoutes(app: FastifyInstance): void {
  app.get('/market/coin-list', async (_request, reply) =>
    handleUpbitRequest(reply, fetchMarkets, marketDtoListSchema),
  )

  app.get('/market/exchange/ticker', async (_request, reply) =>
    handleUpbitRequest(reply, () => fetchTickers([...config.targetCoins]), tickerDtoListSchema),
  )

  registerMarketQueryRoute(
    app,
    '/market/exchange/candle',
    fetchCandles,
    candleDtoListSchema,
  )
  registerMarketQueryRoute(
    app,
    '/market/exchange/orderbook',
    fetchOrderbook,
    orderbookDtoListSchema,
  )
  registerMarketQueryRoute(
    app,
    '/market/exchange/trade-ticks',
    fetchTradeTicks,
    tradeDtoListSchema,
  )
}
