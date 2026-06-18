import compress from '@fastify/compress'
import cors from '@fastify/cors'
import Fastify, { type FastifyInstance } from 'fastify'

import { registerMarketRoutes } from './routes/market.js'

export function buildApp(): FastifyInstance {
  const app = Fastify({ logger: false })

  void app.register(cors, { origin: true })
  void app.register(compress)

  app.get('/health', async () => ({ status: 'ok' }))
  registerMarketRoutes(app)

  return app
}
