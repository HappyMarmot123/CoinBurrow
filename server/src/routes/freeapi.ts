import type { FastifyInstance, FastifyReply } from "fastify"
import { z } from "zod"

import { freeApiProviders } from "../freeapi/index.js"
import { FreeApiError } from "../freeapi/errors.js"
import { normalizeCanonicalSymbol, toSymbolsFromList, validateNoUpbitOverlap } from "../freeapi/symbols.js"
import type { ExternalApiProvider } from "../freeapi/types.js"
import { getFreeApiPolicy } from "../freeapi/policy.js"

const marketQuerySchema = z.object({
  symbols: z.string().trim().min(1),
  excludeUpbitOverlap: z.coerce.boolean().optional().default(true),
})

const symbolQuerySchema = z.object({
  symbol: z.string().trim().min(1),
})

const symbolWithDepthQuerySchema = symbolQuerySchema.extend({
  depth: z.coerce.number().int().min(1).max(1000).optional(),
})

const klineQuerySchema = z.object({
  symbol: z.string().trim().min(1),
  interval: z.string().trim().min(1),
  from: z.coerce.number().optional(),
  to: z.coerce.number().optional(),
  limit: z.coerce.number().int().min(1).max(300).optional(),
})

const bybitDerivativesQuerySchema = z.object({
  symbol: z.string().trim().min(1),
  category: z.enum(["spot", "linear", "inverse"]).optional().default("linear"),
})
const metaQuerySchema = z.object({
  coinId: z.string().trim().min(1),
})

const supportedProviders = Object.keys(freeApiProviders) as ExternalApiProvider[]
const supportedProviderSet = new Set<string>(supportedProviders)

function toProviderOrThrow(providerName: string): ExternalApiProvider {
  if (!supportedProviderSet.has(providerName)) {
    throw new FreeApiError(`unsupported provider: ${providerName}`, "INVALID_SYMBOL", { retryable: false })
  }
  return providerName as ExternalApiProvider
}

function normalizeSymbols(raw: string): string[] {
  return toSymbolsFromList(raw).map(normalizeCanonicalSymbol)
}

function replyError(
  reply: FastifyReply,
  status: number,
  code: string,
  message: string,
) {
  return reply.code(status).send({
    success: false,
    code,
    message,
    timestamp: Date.now(),
  })
}

function withParsedQuery<TSchema extends z.ZodTypeAny>(
  reply: FastifyReply,
  query: unknown,
  schema: TSchema,
  invalidMessage: string,
  handler: (value: z.output<TSchema>) => Promise<unknown>,
): Promise<unknown> {
  const parsed = schema.safeParse(query)
  if (!parsed.success) {
    return Promise.resolve(
      reply.code(400).send({
        success: false,
        code: "VALIDATION_ERROR",
        message: invalidMessage,
        timestamp: Date.now(),
      }),
    )
  }

  return handler(parsed.data).catch((error) => {
    if (!(error instanceof FreeApiError)) {
      throw error
    }

    const status = error.code === "INVALID_SYMBOL" ? 400 : 502
    const messages: Record<string, string> = {
      RATE_LIMIT: "Upstream rate limit exceeded",
      NETWORK_ERROR: "Upstream network request failed",
      TIMEOUT: "Upstream request timed out",
      SCHEMA_MISMATCH: "Upstream response schema mismatch",
      UPSTREAM_ERROR: "Upstream response failed",
      INVALID_SYMBOL: "Invalid symbol or category",
    }

    return replyError(reply, status, error.code, messages[error.code] ?? error.message)
  }) as Promise<unknown>
}

function shouldDegradeMetaError(error: unknown): error is FreeApiError {
  if (!(error instanceof FreeApiError)) {
    return false
  }

  return (
    error.code === "RATE_LIMIT"
    || error.code === "NETWORK_ERROR"
    || error.code === "TIMEOUT"
    || error.code === "UPSTREAM_ERROR"
    || error.code === "SCHEMA_MISMATCH"
  )
}

export function registerFreeApiRoutes(app: FastifyInstance): void {
  app.get("/market/freeapi/policy", (_request, reply) => reply.send(getFreeApiPolicy()))

  app.get("/market/freeapi/binance/markets", (request, reply) =>
    withParsedQuery(
      reply,
      request.query,
      marketQuerySchema,
      "invalid free API market query",
      ({ symbols, excludeUpbitOverlap }) => {
        const adapter = freeApiProviders[toProviderOrThrow("binance")]
        const normalized = normalizeSymbols(symbols)
        const requested = excludeUpbitOverlap ? validateNoUpbitOverlap(normalized) : normalized
        return adapter.fetchMarketSnapshot(requested)
      },
    ),
  )

  app.get("/market/freeapi/binance/orderbook", (request, reply) =>
    withParsedQuery(
      reply,
      request.query,
      symbolWithDepthQuerySchema,
      "invalid free API orderbook query",
      ({ symbol, depth }) => {
        const adapter = freeApiProviders[toProviderOrThrow("binance")]
        return adapter.fetchOrderBook(symbol, depth ?? 15)
      },
    ),
  )

  app.get("/market/freeapi/binance/klines", (request, reply) =>
    withParsedQuery(
      reply,
      request.query,
      klineQuerySchema,
      "invalid free API kline query",
      ({ symbol, interval, from, to, limit }) =>
        freeApiProviders[toProviderOrThrow("binance")].fetchKlines(symbol, interval, from, to, limit),
    ),
  )

  app.get("/market/freeapi/bybit/derivatives", (request, reply) =>
    withParsedQuery(
      reply,
      request.query,
      bybitDerivativesQuerySchema,
      "invalid free API derivatives query",
      ({ symbol, category }) =>
        freeApiProviders[toProviderOrThrow("bybit")].fetchDerivatives(symbol, category),
    ),
  )

  app.get("/market/freeapi/coingecko/meta", (request, reply) =>
    withParsedQuery(
      reply,
      request.query,
      metaQuerySchema,
      "invalid free API meta query",
      ({ coinId }) => {
        const adapter = freeApiProviders[toProviderOrThrow("coingecko")]
        return adapter.fetchMeta(coinId).catch((error) => {
          if (shouldDegradeMetaError(error)) {
            return null
          }
          throw error
        })
      },
    ),
  )

  app.get("/market/freeapi/coinpaprika/meta", (request, reply) =>
    withParsedQuery(
      reply,
      request.query,
      metaQuerySchema,
      "invalid free API meta query",
      ({ coinId }) => freeApiProviders[toProviderOrThrow("coinpaprika")].fetchMeta(coinId),
    ),
  )
}
