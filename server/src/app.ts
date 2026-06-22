import cors from '@fastify/cors'
import Fastify, { type FastifyInstance } from 'fastify'

import { registerMarketRoutes } from './routes/market.js'
import { registerNewsRoutes } from './routes/news.js'

export function buildApp(): FastifyInstance {
  const app = Fastify({ logger: false })

  void app.register(cors, { origin: true })

  app.get('/health', async () => ({ status: 'ok' }))
  registerMarketRoutes(app)
  registerNewsRoutes(app)

  return app
}
