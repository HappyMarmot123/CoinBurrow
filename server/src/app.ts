import cors from '@fastify/cors'
import Fastify, { type FastifyInstance } from 'fastify'

import { registerMarketRoutes } from './routes/market.js'
import { registerFreeApiRoutes } from './routes/freeapi.js'
import { registerSentimentRoutes } from './routes/sentiment.js'
import { registerFxRoutes } from './routes/fx.js'
import { registerKimchiRoutes } from './routes/kimchi.js'
import { registerGlobalRoutes } from './routes/global.js'
import {
  registerSimulatorRoutes,
  type SimulatorRouteDependencies,
} from './routes/simulator.js'

export interface BuildAppOptions {
  simulatorDependencies?: SimulatorRouteDependencies
}

export function buildApp(options: BuildAppOptions = {}): FastifyInstance {
  const app = Fastify({ logger: false })

  void app.register(cors, { origin: true })

  app.get('/health', async () => ({ status: 'ok' }))
  registerMarketRoutes(app)
  registerFreeApiRoutes(app)
  registerSentimentRoutes(app)
  registerFxRoutes(app)
  registerKimchiRoutes(app)
  registerGlobalRoutes(app)
  registerSimulatorRoutes(app, options.simulatorDependencies)

  return app
}
