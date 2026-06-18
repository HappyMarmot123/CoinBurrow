import cors from '@fastify/cors'
import Fastify, { type FastifyInstance } from 'fastify'

export function buildApp(): FastifyInstance {
  const app = Fastify({ logger: false })

  void app.register(cors, { origin: true })

  app.get('/health', async () => ({ status: 'ok' }))

  return app
}
