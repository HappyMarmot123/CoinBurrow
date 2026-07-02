import cors from '@fastify/cors'
import Fastify, { type FastifyInstance } from 'fastify'

import { registerMarketRoutes } from './routes/market.js'
import { registerFreeApiRoutes } from './routes/freeapi.js'
import { registerSentimentRoutes } from './routes/sentiment.js'
import { registerFxRoutes } from './routes/fx.js'
import { registerKimchiRoutes } from './routes/kimchi.js'
import { registerGlobalRoutes } from './routes/global.js'

export function buildApp(): FastifyInstance {
  const app = Fastify({ logger: false })

  void app.register(cors, { origin: true })

  app.get('/health', async () => ({ status: 'ok' }))
  registerMarketRoutes(app)
  registerFreeApiRoutes(app)
  registerSentimentRoutes(app)
  registerFxRoutes(app)
  registerKimchiRoutes(app)
  registerGlobalRoutes(app)

  return app
}
