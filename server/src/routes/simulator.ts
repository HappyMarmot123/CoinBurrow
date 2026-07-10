import type { FastifyInstance } from 'fastify'

import {
  type SimulatorUserVerifier,
  verifySimulatorUser,
} from '../simulator/auth.js'
import { SimulatorError } from '../simulator/errors.js'

export interface SimulatorRouteDeps {
  verifyUser?: SimulatorUserVerifier
}

function toErrorPayload(error: SimulatorError): { error: string; message: string } {
  return {
    error: error.code,
    message: error.message,
  }
}

export function registerSimulatorRoutes(
  app: FastifyInstance,
  deps: SimulatorRouteDeps = {},
): void {
  app.get('/api/simulator/session', async (request, reply) => {
    try {
      const user = await verifySimulatorUser(request.headers.authorization, deps.verifyUser)

      return {
        authenticated: true,
        userId: user.id,
        email: user.email,
      }
    } catch (error) {
      if (error instanceof SimulatorError) {
        return reply.status(error.statusCode).send(toErrorPayload(error))
      }

      throw error
    }
  })
}
