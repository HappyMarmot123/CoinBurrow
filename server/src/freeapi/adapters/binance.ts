import { z } from "zod"

import { cached } from "../cache.js"
import { parseNumericString, requestJson } from "../http.js"
import { FreeApiError } from "../errors.js"
import { toBinanceSymbol } from "../symbols.js"
import type {
  IExchangeApiAdapter,
  KlineSnapshot,
  MarketSnapshot,
  OrderBookSnapshot,
} from "../types.js"

const BINANCE_BASE_URL = "https://api.binance.com"
const CACHE_TTL_MS = 30_000

const BINANCE_INTERVALS = ["1m", "3m", "5m", "15m", "30m", "1h", "4h", "1d", "1w", "1M"] as const
const SUPPORTED_DERIVED_QUOTES = [
  "USDT",
  "BUSD",
  "BTC",
  "ETH",
  "BNB",
  "USD",
  "USDC",
] as const

type BinanceInterval = (typeof BINANCE_INTERVALS)[number]

const BINANCE_TICKER_SCHEMA = z.array(
  z.object({
    symbol: z.string().trim().min(2),
    lastPrice: z.union([z.string(), z.number()]),
    priceChangePercent: z.union([z.string(), z.number()]),
    quoteVolume: z.union([z.string(), z.number()]),
    volume: z.union([z.string(), z.number()]),
    closeTime: z.union([z.string(), z.number()]).optional(),
  }).passthrough(),
)

const BINANCE_ORDERBOOK_SCHEMA = z.object({
  lastUpdateId: z.number(),
  bids: z.array(z.tuple([z.union([z.string(), z.number()]), z.union([z.string(), z.number()])])),
  asks: z.array(z.tuple([z.union([z.string(), z.number()]), z.union([z.string(), z.number()])])),
})

const BINANCE_KLINE_SCHEMA = z.array(z.array(z.unknown()))

const BINANCE_QUOTES = new Set(SUPPORTED_DERIVED_QUOTES)

function normalizeSymbolToMap(symbol: string): string {
  const normalized = symbol.trim().toUpperCase()
  if (normalized.length < 4) {
    throw new FreeApiError(`invalid symbol: ${symbol}`, "INVALID_SYMBOL", { retryable: false })
  }

  if (normalized.includes("/")) {
    const [base, quote] = normalized.split("/")
    return `${base}/${quote}`
  }

  for (const quote of BINANCE_QUOTES) {
    if (normalized.endsWith(quote)) {
      return `${normalized.slice(0, -quote.length)}/${quote}`
    }
  }

  // fallback to 3-char quote for simple tokens
  return `${normalized.slice(0, -3)}/${normalized.slice(-3)}`
}

function parseKline(item: unknown[], symbol: string, interval: string): KlineSnapshot {
  if (!Array.isArray(item) || item.length < 6) {
    throw new FreeApiError("invalid kline row", "SCHEMA_MISMATCH", { retryable: false })
  }

  const parsedTs = Number(item[0])
  if (!Number.isFinite(parsedTs)) {
    throw new FreeApiError("invalid kline timestamp", "SCHEMA_MISMATCH", { retryable: false })
  }

  return {
    symbol,
    source: "binance",
    interval,
    open: parseNumericString(item[1]),
    high: parseNumericString(item[2]),
    low: parseNumericString(item[3]),
    close: parseNumericString(item[4]),
    volume: parseNumericString(item[5]),
    ts: parsedTs,
  }
}

function parseTs(value: string | number | undefined): number {
  if (typeof value === "number") return value
  if (typeof value === "string") {
    const parsed = Number(value.trim())
    if (Number.isFinite(parsed)) return parsed
  }
  return Date.now()
}

async function fetchTickerSnapshot(symbols: string[]): Promise<MarketSnapshot[]> {
  const normalized = [...new Set(symbols.map((symbol) => symbol.trim().toUpperCase()))]
  if (normalized.length === 0) return []

  const byBinanceSymbol = new Map<string, string>()
  const binanceSymbols = normalized.map((symbol) => {
    const binanceSymbol = toBinanceSymbol(symbol)
    const canonical = normalizeSymbolToMap(symbol)
    byBinanceSymbol.set(binanceSymbol, canonical)
    return binanceSymbol
  })

  const query = encodeURIComponent(`["${binanceSymbols.join(`","`)}"]`)
  const payload = await requestJson(
    `${BINANCE_BASE_URL}/api/v3/ticker/24hr?symbols=${query}`,
    BINANCE_TICKER_SCHEMA,
  )

  return payload.map((item) => {
    const canonical = byBinanceSymbol.get(item.symbol) ?? normalizeSymbolToMap(item.symbol)
    return {
      symbol: canonical,
      source: "binance",
      lastPrice: parseNumericString(item.lastPrice),
      changeRate: parseNumericString(item.priceChangePercent),
      volume: parseNumericString(item.volume),
      quoteVolume: parseNumericString(item.quoteVolume),
      ts: parseTs(item.closeTime),
    }
  })
}

async function fetchTickerSnapshotCached(symbols: string[]): Promise<MarketSnapshot[]> {
  const key = `binance:markets:${symbols.join(",")}`
  return cached(key, CACHE_TTL_MS, () => fetchTickerSnapshot(symbols))
}

async function fetchOrderbookRaw(symbol: string, depth: number): Promise<OrderBookSnapshot> {
  const normalizedDepth = Math.min(1000, Math.max(1, Math.floor(depth)))
  const target = toBinanceSymbol(symbol)
  const response = await requestJson(
    `${BINANCE_BASE_URL}/api/v3/depth?symbol=${target}&limit=${normalizedDepth}`,
    BINANCE_ORDERBOOK_SCHEMA,
  )

  return {
    symbol: normalizeSymbolToMap(target),
    source: "binance",
    bids: response.bids.map(([price, size]) => [
      parseNumericString(price),
      parseNumericString(size),
    ]),
    asks: response.asks.map(([price, size]) => [
      parseNumericString(price),
      parseNumericString(size),
    ]),
    lastUpdateTs: Date.now(),
    depth: normalizedDepth,
  }
}

async function fetchKlinesRaw(
  symbol: string,
  interval: string,
  fromMs?: number,
  toMs?: number,
  limit = 200,
): Promise<KlineSnapshot[]> {
  if (!BINANCE_INTERVALS.includes(interval as BinanceInterval)) {
    throw new FreeApiError(`unsupported interval: ${interval}`, "INVALID_SYMBOL", { retryable: false })
  }

  const params = new URLSearchParams({
    symbol: toBinanceSymbol(symbol),
    interval,
    limit: String(Math.max(1, Math.min(limit, 1000))),
  })

  if (typeof fromMs === "number" && Number.isFinite(fromMs)) {
    params.set("startTime", String(Math.max(0, Math.floor(fromMs))))
  }
  if (typeof toMs === "number" && Number.isFinite(toMs)) {
    params.set("endTime", String(Math.floor(toMs)))
  }

  const payload = await requestJson<unknown[][]>(
    `${BINANCE_BASE_URL}/api/v3/klines?${params.toString()}`,
    BINANCE_KLINE_SCHEMA,
  )

  return payload.map((row) => {
    const parsed = parseKline(row, normalizeSymbolToMap(symbol), interval)
    return {
      ...parsed,
    }
  })
}

export const binanceAdapter: IExchangeApiAdapter = {
  name: "binance",
  supports: (capability) => ["market", "orderbook", "kline"].includes(capability),
  fetchMarketSnapshot: (symbols) => fetchTickerSnapshotCached(symbols ?? []),
  fetchOrderBook: (symbol, depth) => fetchOrderbookRaw(symbol, depth ?? 15),
  fetchKlines: (symbol, interval, fromMs, toMs, limit) =>
    fetchKlinesRaw(symbol, interval, fromMs, toMs, limit),
  fetchDerivatives: async () => null,
  fetchMeta: async () => null,
}
