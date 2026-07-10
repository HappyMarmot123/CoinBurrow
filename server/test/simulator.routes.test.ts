import { describe, expect, it } from 'vitest'
import Fastify from 'fastify'
import { registerSimulatorRoutes } from '../src/routes/simulator.js'

describe('simulator routes', () => {
  it('returns 401 without bearer token', async () => {
    const app = Fastify()
    registerSimulatorRoutes(app, {
      verifyUser: async () => null,
    })

    const response = await app.inject({ method: 'GET', url: '/api/simulator/session' })

    expect(response.statusCode).toBe(401)
    expect(response.json()).toEqual({
      error: 'SIM_AUTH_REQUIRED',
      message: 'Authorization bearer token is required',
    })
  })

  it('returns session for authenticated user', async () => {
    const app = Fastify()
    registerSimulatorRoutes(app, {
      verifyUser: async () => ({ id: 'user-1', email: 'a@example.com' }),
    })

    const response = await app.inject({
      method: 'GET',
      url: '/api/simulator/session',
      headers: { authorization: 'Bearer token' },
    })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toEqual({
      authenticated: true,
      userId: 'user-1',
      email: 'a@example.com',
    })
  })
})
