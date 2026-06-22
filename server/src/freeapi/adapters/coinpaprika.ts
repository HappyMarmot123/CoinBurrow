import { z } from "zod"

import { cached } from "../cache.js"
import { requestJson } from "../http.js"
import { FreeApiError } from "../errors.js"
import type {
  CoinMeta,
  IExchangeApiAdapter,
} from "../types.js"
import { COINPAPRIKA_META_TTL_MS } from "../policy.js"

const COINPAPRIKA_BASE_URL = "https://api.coinpaprika.com/v1"

const COINPAPRIKA_COIN_SCHEMA = z.object({
  id: z.string().optional(),
  name: z.string().optional(),
  symbol: z.string().optional(),
  type: z.string().optional(),
  description: z.string().optional(),
  category: z.unknown().optional(),
  tags: z.array(z.unknown()).optional(),
  links: z
    .object({
      website_url: z.unknown().optional(),
      whitepaper: z
        .union([
          z.unknown(),
          z.object({
            link: z.string().optional(),
            url: z.string().optional(),
          }),
        ])
        .optional(),
      team: z.array(z.unknown()).optional(),
    })
    .optional(),
}).passthrough()

const COINPAPRIKA_EVENTS_SCHEMA = z.array(
  z.object({
    id: z.string().optional(),
    date: z.string().optional(),
    title: z.string().optional(),
  }).passthrough(),
)

function parseWhitepaper(raw: unknown): string | undefined {
  if (typeof raw === "string" && raw.trim().length > 0) {
    return raw.trim()
  }

  if (raw && typeof raw === "object") {
    const value = raw as Record<string, unknown>
    const candidate = (value.link as string | undefined) ?? (value.url as string | undefined)
    if (typeof candidate === "string" && candidate.trim().length > 0) {
      return candidate.trim()
    }
  }

  return undefined
}

function parseMetaTeam(raw: unknown): string[] | undefined {
  if (!Array.isArray(raw)) return undefined
  return raw.flatMap((value) => {
    if (typeof value === "string") return [value]
    if (value && typeof value === "object") {
      const typed = value as Record<string, unknown>
      const name = typed.name
      return typeof name === "string" && name.trim().length > 0 ? [name] : []
    }
    return []
  })
}

function parseEventTitles(events: Array<{ title?: string }>): string[] {
  return events.flatMap((event) => (typeof event.title === "string" && event.title.trim().length > 0 ? [event.title] : []))
}

async function fetchCoinPaprikaMeta(coinId: string): Promise<CoinMeta> {
  const normalizedId = coinId.trim()
  if (!normalizedId) {
    throw new FreeApiError("invalid coin id", "INVALID_SYMBOL", { retryable: false })
  }

  const [coinPayload, eventsPayload] = await Promise.all([
    requestJson<z.output<typeof COINPAPRIKA_COIN_SCHEMA>>(
      `${COINPAPRIKA_BASE_URL}/coins/${encodeURIComponent(normalizedId)}`,
      COINPAPRIKA_COIN_SCHEMA,
    ),
    requestJson<z.output<typeof COINPAPRIKA_EVENTS_SCHEMA>>(
      `${COINPAPRIKA_BASE_URL}/coins/${encodeURIComponent(normalizedId)}/events`,
      COINPAPRIKA_EVENTS_SCHEMA,
    ),
  ])

  const symbol = (coinPayload.symbol ?? normalizedId).trim().toUpperCase()

  const team = parseMetaTeam(coinPayload.links?.team)
  const whitepaper = parseWhitepaper(coinPayload.links?.whitepaper)
  const events = parseEventTitles(eventsPayload)

  const category =
    typeof coinPayload.type === "string" && coinPayload.type.trim().length > 0
      ? coinPayload.type.trim()
      : typeof coinPayload.category === "string" && coinPayload.category.trim().length > 0
        ? coinPayload.category.trim()
        : undefined

  return {
    coinId: coinPayload.id ?? normalizedId,
    name: coinPayload.name?.trim() || normalizedId,
    symbol,
    logo: undefined,
    category,
    website: typeof coinPayload.links?.website_url === "string" ? coinPayload.links.website_url : undefined,
    description: coinPayload.description?.trim(),
    tags: Array.isArray(coinPayload.tags)
      ? coinPayload.tags.filter((tag) => typeof tag === "string") as string[]
      : undefined,
    whitepaper,
    recentEvents: events,
    team,
  }
}

async function fetchCoinPaprikaMetaCached(coinId: string): Promise<CoinMeta> {
  const normalizedId = coinId.trim()
  const key = `coinpaprika:meta:${normalizedId}`
  return cached(key, COINPAPRIKA_META_TTL_MS, () => fetchCoinPaprikaMeta(normalizedId))
}

export const coinpaprikaAdapter: IExchangeApiAdapter = {
  name: "coinpaprika",
  supports: (capability) => capability === "meta",
  fetchMarketSnapshot: async () => [],
  fetchOrderBook: async () => {
    throw new FreeApiError("orderbook not supported", "INVALID_SYMBOL", { retryable: false })
  },
  fetchKlines: async () => [],
  fetchDerivatives: async () => null,
  fetchMeta: (coinId) => {
    if (!coinId.trim()) {
      throw new FreeApiError("invalid coin id", "INVALID_SYMBOL", { retryable: false })
    }
    return fetchCoinPaprikaMetaCached(coinId)
  },
}
