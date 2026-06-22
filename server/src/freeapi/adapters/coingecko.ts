import { z } from "zod"

import { cachedWithStale } from "../cache.js"
import { requestJson } from "../http.js"
import { FreeApiError } from "../errors.js"
import type {
  CoinMeta,
  IExchangeApiAdapter,
} from "../types.js"
import { COINGECKO_META_STALE_TTL_MS, COINGECKO_META_TTL_MS } from "../policy.js"

const COINGECKO_BASE_URL = "https://api.coingecko.com/api/v3"
const COINGECKO_SYMBOL_ID_OVERRIDES: Record<string, string> = {
  btc: "bitcoin",
  eth: "ethereum",
  xrp: "ripple",
  usdt: "tether",
  usdc: "usd-coin",
  usdceth: "usd-coin",
  bnb: "binancecoin",
  ada: "cardano",
  doge: "dogecoin",
  sol: "solana",
  ltc: "litecoin",
  trx: "tron",
  dot: "polkadot",
  bch: "bitcoin-cash",
  xmr: "monero",
  bsv: "bitcoin-sv",
  ton: "the-open-network",
  etc: "ethereum-classic",
  op: "optimism",
  arb: "arbitrum",
  stx: "stacks",
  matic: "matic-network",
}

const COINGECKO_DEMO_API_KEY = process.env.COINGECKO_DEMO_API_KEY
  ?? process.env.X_CG_DEMO_API_KEY
  ?? process.env.CG_DEMO_API_KEY

function normalizeCoinId(value: string): string {
  return value.trim().toLowerCase()
}

function uniqueValues(values: string[]): string[] {
  const out: string[] = []
  const seen = new Set<string>()
  for (const value of values) {
    if (!value) continue
    if (seen.has(value)) continue
    seen.add(value)
    out.push(value)
  }
  return out
}

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/--+/g, "-")
}

function resolveCoinIds(rawCoinId: string): string[] {
  const normalized = normalizeCoinId(rawCoinId)
  const override = COINGECKO_SYMBOL_ID_OVERRIDES[normalized]
  const slug = slugify(rawCoinId)

  return uniqueValues([override, slug, normalized]).filter(Boolean)
}

function appendDemoKey(params: URLSearchParams): void {
  if (!COINGECKO_DEMO_API_KEY) return
  params.set("x_cg_demo_api_key", COINGECKO_DEMO_API_KEY)
}

const COINGECKO_COIN_SCHEMA = z.object({
  id: z.string().optional(),
  symbol: z.string().optional(),
  name: z.string().optional(),
  description: z.record(z.string(), z.string()).optional(),
  categories: z.array(z.string()).optional(),
  links: z
    .object({
      homepage: z.array(z.unknown()).optional(),
      whitepaper: z.unknown().optional(),
    })
    .optional(),
  image: z
    .object({
      thumb: z.unknown().optional(),
      small: z.unknown().optional(),
      large: z.unknown().optional(),
    })
    .optional(),
}).passthrough()

function firstNonEmptyUrl(values: unknown): string | undefined {
  if (!Array.isArray(values)) return undefined
  for (const value of values) {
    if (typeof value === "string" && value.trim() !== "") return value
  }
  return undefined
}

function extractDescription(source: Record<string, unknown> | undefined): string | undefined {
  if (!source) return undefined
  const english = source.en
  if (typeof english === "string" && english.trim().length > 0) {
    return english
  }

  for (const value of Object.values(source)) {
    if (typeof value === "string" && value.trim().length > 0) {
      return value
    }
  }

  return undefined
}

function normalizeSymbol(source?: string): string {
  if (!source) return ""
  return source.trim().toUpperCase()
}

async function fetchCoinMeta(coinId: string): Promise<CoinMeta> {
  const normalizedId = coinId.trim().toLowerCase()
  const params = new URLSearchParams({
    localization: "false",
    tickers: "false",
    market_data: "false",
    community_data: "false",
    developer_data: "false",
    sparkline: "false",
  })
  appendDemoKey(params)

  const payload = await requestJson<z.output<typeof COINGECKO_COIN_SCHEMA>>(
    `${COINGECKO_BASE_URL}/coins/${encodeURIComponent(normalizedId)}?${params}`,
    COINGECKO_COIN_SCHEMA,
  )

  const symbol = normalizeSymbol(
    (typeof payload.symbol === "string" && payload.symbol.trim().length > 0)
      ? payload.symbol
      : normalizedId,
  )
  const name = payload.name?.trim() || normalizedId

  return {
    coinId: payload.id ?? normalizedId,
    name,
    symbol,
    logo: typeof payload.image?.large === "string"
      ? payload.image.large
      : typeof payload.image?.small === "string"
        ? payload.image.small
        : typeof payload.image?.thumb === "string"
          ? payload.image.thumb
          : undefined,
    category: payload.categories?.[0],
    website: firstNonEmptyUrl(payload.links?.homepage),
    description: extractDescription(payload.description),
    tags: payload.categories,
    whitepaper: typeof payload.links?.whitepaper === "string" ? payload.links.whitepaper : undefined,
  }
}

async function fetchCoinMetaCached(coinId: string): Promise<CoinMeta> {
  const normalizedId = coinId.trim().toLowerCase()
  const key = `coingecko:meta:${normalizedId}`
  const cachedResult = await cachedWithStale(
    key,
    COINGECKO_META_TTL_MS,
    COINGECKO_META_STALE_TTL_MS,
    () => fetchCoinMeta(normalizedId),
  )

  return cachedResult.value
}

export const coingeckoAdapter: IExchangeApiAdapter = {
  name: "coingecko",
  supports: (capability) => capability === "meta",
  fetchMarketSnapshot: async () => [],
  fetchOrderBook: async () => {
    throw new FreeApiError("orderbook not supported", "INVALID_SYMBOL", { retryable: false })
  },
  fetchKlines: async () => [],
  fetchDerivatives: async () => null,
  fetchMeta: async (coinId) => {
    if (!coinId.trim()) {
      throw new FreeApiError("invalid coin id", "INVALID_SYMBOL", { retryable: false })
    }
    const candidates = resolveCoinIds(coinId)
    let lastError: unknown

    for (const candidate of candidates) {
      try {
        return await fetchCoinMetaCached(candidate)
      } catch (error) {
        if (error instanceof FreeApiError && error.status === 404 && error.code === "UPSTREAM_ERROR") {
          lastError = error
          continue
        }
        lastError = error
        break
      }
    }

    if (lastError instanceof FreeApiError && lastError.code === "UPSTREAM_ERROR" && lastError.status === 404) {
      return null
    }

    throw (lastError ?? new FreeApiError("no coin meta found", "INVALID_SYMBOL", { retryable: false }))
  },
}
