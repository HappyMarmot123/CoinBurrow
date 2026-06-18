import type { FastifyInstance, FastifyReply } from 'fastify'
import { z } from 'zod'

import { config } from '../config.js'
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

const upstreamErrorResponse = { error: 'upstream unavailable' } as const

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

function registerMarketQueryRoute<T>(
  app: FastifyInstance,
  path: string,
  request: (market: string) => Promise<T>,
): void {
  app.get(path, async (fastifyRequest, reply) => {
    const query = marketQuerySchema.safeParse(fastifyRequest.query)

    if (!query.success) {
      return reply.code(400).send({ error: 'market is required' })
    }

    return handleUpbitRequest(reply, () => request(query.data.market))
  })
}

export function registerMarketRoutes(app: FastifyInstance): void {
  app.get('/market/coin-list', async (_request, reply) =>
    handleUpbitRequest(reply, fetchMarkets),
  )

  app.get('/market/exchange/ticker', async (_request, reply) =>
    handleUpbitRequest(reply, () => fetchTickers([...config.targetCoins])),
  )

  registerMarketQueryRoute(
    app,
    '/market/exchange/candle',
    fetchCandles,
  )
  registerMarketQueryRoute(
    app,
    '/market/exchange/orderbook',
    fetchOrderbook,
  )
  registerMarketQueryRoute(
    app,
    '/market/exchange/trade-ticks',
    fetchTradeTicks,
  )
}
