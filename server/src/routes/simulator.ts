import { createClient } from '@supabase/supabase-js'
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'

import { config } from '../config.js'
import { SupabaseAuthenticator, type SimulatorAuthenticator } from '../simulator/auth.js'
import {
  SimulatorAuthError,
  SimulatorConfigurationError,
  SimulatorError,
} from '../simulator/errors.js'
import { UpbitSimulatorQuoteProvider } from '../simulator/quoteProvider.js'
import { SupabaseSimulatorRepository } from '../simulator/repository.js'
import { SimulatorService } from '../simulator/service.js'
import { SUPPORTED_SYMBOLS, type SimulatorSymbol } from '../simulator/types.js'

const orderSchema = z.object({
  symbol: z.string().trim().toUpperCase().pipe(z.enum(SUPPORTED_SYMBOLS)),
  side: z.string().trim().toLowerCase().pipe(z.enum(['buy', 'sell'])),
  quantity: z.number().finite().positive().max(1_000_000).refine(
    (value) => Math.abs(value * 100_000_000 - Math.round(value * 100_000_000)) < 0.000001,
    'quantity supports up to 8 decimal places',
  ),
}).strict()

const quoteQuerySchema = z.object({
  symbols: z.string().trim().min(1),
})

export interface SimulatorRouteDependencies {
  authenticator: SimulatorAuthenticator
  service: SimulatorService
}

let defaultDependencies: SimulatorRouteDependencies | null = null

function createDefaultDependencies(): SimulatorRouteDependencies {
  if (!config.supabaseUrl || !config.supabaseServiceRoleKey) {
    throw new SimulatorConfigurationError()
  }

  const client = createClient(config.supabaseUrl, config.supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  })

  return {
    authenticator: new SupabaseAuthenticator(client),
    service: new SimulatorService(
      new SupabaseSimulatorRepository(client),
      new UpbitSimulatorQuoteProvider(),
    ),
  }
}

function resolveDependencies(overrides?: SimulatorRouteDependencies): SimulatorRouteDependencies {
  if (overrides) return overrides
  defaultDependencies ??= createDefaultDependencies()
  return defaultDependencies
}

async function authenticate(
  request: FastifyRequest,
  dependencies: SimulatorRouteDependencies,
): Promise<string> {
  const user = await dependencies.authenticator.authenticate(request.headers.authorization)
  return user.id
}

function sendError(reply: FastifyReply, error: unknown): FastifyReply {
  if (error instanceof SimulatorError) {
    return reply.code(error.statusCode).send({
      error: { code: error.code, message: error.message },
    })
  }

  return reply.code(500).send({
    error: { code: 'INTERNAL_ERROR', message: '요청을 처리하지 못했습니다.' },
  })
}

function parseSymbols(raw: string): SimulatorSymbol[] | null {
  const symbols = [...new Set(raw.split(',').map((symbol) => symbol.trim().toUpperCase()))]
  if (symbols.length === 0 || symbols.some((symbol) => !SUPPORTED_SYMBOLS.includes(symbol as SimulatorSymbol))) {
    return null
  }
  return symbols as SimulatorSymbol[]
}

export function registerSimulatorRoutes(
  app: FastifyInstance,
  dependencyOverrides?: SimulatorRouteDependencies,
): void {
  app.get('/market/quote', async (request, reply) => {
    const query = quoteQuerySchema.safeParse(request.query)
    if (!query.success) {
      return reply.code(400).send({ error: { code: 'INVALID_SYMBOLS', message: 'symbols가 필요합니다.' } })
    }

    const symbols = parseSymbols(query.data.symbols)
    if (!symbols) {
      return reply.code(400).send({ error: { code: 'INVALID_SYMBOLS', message: 'BTC와 ETH만 지원합니다.' } })
    }

    try {
      return await resolveDependencies(dependencyOverrides).service.getQuotes(symbols)
    } catch (error) {
      return sendError(reply, error)
    }
  })

  app.get('/simulator/state', async (request, reply) => {
    try {
      const dependencies = resolveDependencies(dependencyOverrides)
      const userId = await authenticate(request, dependencies)
      return await dependencies.service.getState(userId)
    } catch (error) {
      return sendError(reply, error)
    }
  })

  app.post('/simulator/order', async (request, reply) => {
    const order = orderSchema.safeParse(request.body)
    if (!order.success) {
      return reply.code(400).send({
        error: { code: 'INVALID_ORDER', message: '주문 입력값이 유효하지 않습니다.' },
      })
    }

    try {
      const dependencies = resolveDependencies(dependencyOverrides)
      const userId = await authenticate(request, dependencies)
      return await dependencies.service.executeOrder({ userId, ...order.data })
    } catch (error) {
      return sendError(reply, error)
    }
  })

  app.post('/simulator/reset', async (request, reply) => {
    try {
      const dependencies = resolveDependencies(dependencyOverrides)
      const userId = await authenticate(request, dependencies)
      return await dependencies.service.reset(userId)
    } catch (error) {
      return sendError(reply, error)
    }
  })
}

