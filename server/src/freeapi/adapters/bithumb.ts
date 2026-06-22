import { z } from "zod"

import { cached } from "../cache.js"
import { parseNumericString, requestJson } from "../http.js"
import { FreeApiError } from "../errors.js"
import { normalizeCanonicalSymbol, toBithumbCurrency } from "../symbols.js"
import type {
  IExchangeApiAdapter,
  KlineSnapshot,
  MarketSnapshot,
  OrderBookSnapshot,
} from "../types.js"

const BITHUMB_BASE_URL = "https://api.bithumb.com"
const BITHUMB_CACHE_TTL_MS = 30_000

const BITHUMB_OBJECT_SCHEMA = z.record(z.unknown())
const BITHUMB_TICKER_SCHEMA = z.union([
  z.record(z.unknown()),
  z.object({ data: z.record(z.unknown()) }),
])
const BITHUMB_KLINE_SCHEMA = z.union([
  z.array(z.array(z.unknown())),
  z.object({ data: z.array(z.array(z.unknown())) }),
])

function unwrapPayload(payload: z.infer<typeof BITHUMB_OBJECT_SCHEMA>): Record<string, unknown> {
  if (
    payload.data
    && typeof payload.data === "object"
    && !Array.isArray(payload.data)
    && payload.data !== null
  ) {
    return payload.data as Record<string, unknown>
  }

  return payload
}

function parseRecordValue(
  value: unknown,
): { tradePrice: string; volume: string; quoteVolume: string } {
  if (!value || typeof value !== "object") {
    return {
      tradePrice: "0",
      volume: "0",
      quoteVolume: "0",
    }
  }

  const values = value as Record<string, unknown>
  const tradePrice =
    typeof values.trade_price === "string" || typeof values.trade_price === "number"
      ? String(values.trade_price)
      : typeof values.closing_price === "string" || typeof values.closing_price === "number"
        ? String(values.closing_price)
        : typeof values.prev_closing_price === "string" || typeof values.prev_closing_price === "number"
          ? String(values.prev_closing_price)
          : "0"

  const volume =
    typeof values.units_traded_24H === "string" || typeof values.units_traded_24H === "number"
      ? String(values.units_traded_24H)
      : typeof values.volume_1day === "string" || typeof values.volume_1day === "number"
        ? String(values.volume_1day)
        : "0"

  const quoteVolume =
    typeof values.acc_trade_value_24H === "string" || typeof values.acc_trade_value_24H === "number"
      ? String(values.acc_trade_value_24H)
      : "0"

  return {
    tradePrice: parseNumericString(tradePrice),
    volume: parseNumericString(volume),
    quoteVolume: parseNumericString(quoteVolume),
  }
}

function parseKlinesFromPayload(rows: unknown[][]): Array<{
  open: string
  high: string
  low: string
  close: string
  volume: string
  ts: number
}> {
  return rows.flatMap((row) => {
    if (!Array.isArray(row) || row.length < 6) return []

    const timestamp = Number(row[0])
    if (!Number.isFinite(timestamp)) return []

    return [
      {
        ts: timestamp,
        open: parseNumericString(row[1]),
        close: parseNumericString(row[2]),
        high: parseNumericString(row[3]),
        low: parseNumericString(row[4]),
        volume: parseNumericString(row[5]),
      },
    ]
  })
}

function normalizeInputSymbol(raw: string): string {
  return normalizeCanonicalSymbol(raw)
}

function assertKrwMarket(raw: string): void {
  const canonical = normalizeCanonicalSymbol(raw)
  const quote = canonical.split("/")[1]

  if (quote !== "KRW") {
    throw new FreeApiError(`invalid Bithumb quote pair: ${raw}`, "INVALID_SYMBOL", { retryable: false })
  }
}

function toPriceSizePairs(rows: unknown[], side: "bids" | "asks"): Array<[string, string]> {
  return rows.flatMap((row) => {
    if (Array.isArray(row) && row.length >= 2) {
      const [price, size] = row
      return [[parseNumericString(price), parseNumericString(size)]]
    }

    if (row && typeof row === "object") {
      const item = row as Record<string, unknown>

      if (side === "bids") {
        if (item.bid_price !== undefined && item.bid_size !== undefined) {
          return [[parseNumericString(item.bid_price), parseNumericString(item.bid_size)]]
        }
        if (item.bidPrice !== undefined && item.bidSize !== undefined) {
          return [[parseNumericString(item.bidPrice), parseNumericString(item.bidSize)]]
        }
        if (item.price !== undefined && item.quantity !== undefined) {
          return [[parseNumericString(item.price), parseNumericString(item.quantity)]]
        }
      } else if (item.ask_price !== undefined && item.ask_size !== undefined) {
        return [[parseNumericString(item.ask_price), parseNumericString(item.ask_size)]]
      } else if (item.askPrice !== undefined && item.askSize !== undefined) {
        return [[parseNumericString(item.askPrice), parseNumericString(item.askSize)]]
      } else if (item.price !== undefined && item.quantity !== undefined) {
        return [[parseNumericString(item.price), parseNumericString(item.quantity)]]
      }
    }

    return []
  })
}

function extractOrderbookRows(
  payload: Record<string, unknown>,
  side: "bids" | "asks",
): unknown[] {
  const units = Array.isArray(payload.orderbook_units) ? payload.orderbook_units : []
  const sideUnits = toPriceSizePairs(
    units as unknown[],
    side,
  )

  if (sideUnits.length > 0) {
    return sideUnits
  }

  const direct = payload[side]
  return Array.isArray(direct) ? direct : []
}

async function fetchBithumbMarket(symbols?: string[]): Promise<MarketSnapshot[]> {
  if (symbols && symbols.length > 0) {
    const rows = await Promise.all(
      symbols.map((symbol) => {
        assertKrwMarket(symbol)
        return requestJson<z.infer<typeof BITHUMB_TICKER_SCHEMA>>(
          `${BITHUMB_BASE_URL}/public/ticker/${toBithumbCurrency(symbol)}`,
          BITHUMB_TICKER_SCHEMA,
        )
      }),
    )

    return rows.map((payload, index) => {
      const raw = unwrapPayload(payload)
      const pair = symbols[index]
      const parsed = parseRecordValue(raw[toBithumbCurrency(pair)] ?? raw)

      return {
        symbol: normalizeInputSymbol(pair),
        source: "bithumb",
        lastPrice: parsed.tradePrice,
        changeRate: "0",
        volume: parsed.volume,
        quoteVolume: parsed.quoteVolume,
        ts: Date.now(),
      }
    })
  }

  const payload = await requestJson<z.infer<typeof BITHUMB_OBJECT_SCHEMA>>(
    `${BITHUMB_BASE_URL}/public/ticker/ALL_TICKER`,
    BITHUMB_OBJECT_SCHEMA,
  )

  const data = unwrapPayload(payload)
  return Object.entries(data).flatMap(([currency, raw]) => {
    const normalized = currency.toUpperCase()
    if (
      !currency
      || normalized === "STATUS"
      || normalized === "DATE"
      || /[^A-Z0-9]/.test(normalized)
    ) {
      return []
    }

    const parsed = parseRecordValue(raw)
    return [
      {
        symbol: `${normalized}/KRW`,
        source: "bithumb",
        lastPrice: parsed.tradePrice,
        changeRate: "0",
        volume: parsed.volume,
        quoteVolume: parsed.quoteVolume,
        ts: Date.now(),
      },
    ]
  })
}

async function fetchBithumbOrderbook(symbol: string): Promise<OrderBookSnapshot> {
  assertKrwMarket(symbol)
  const payload = await requestJson<z.infer<typeof BITHUMB_OBJECT_SCHEMA>>(
    `${BITHUMB_BASE_URL}/public/orderbook/${toBithumbCurrency(symbol)}`,
    BITHUMB_OBJECT_SCHEMA,
  )

  const data = unwrapPayload(payload)
  const bidsRows = extractOrderbookRows(data, "bids")
  const asksRows = extractOrderbookRows(data, "asks")

  const bids = bidsRows.map((row) => {
    if (!Array.isArray(row) || row.length < 2) return undefined
    return [parseNumericString(row[0]), parseNumericString(row[1])] as [string, string]
  }).filter((value): value is [string, string] => value !== undefined)
  const asks = asksRows.map((row) => {
    if (!Array.isArray(row) || row.length < 2) return undefined
    return [parseNumericString(row[0]), parseNumericString(row[1])] as [string, string]
  }).filter((value): value is [string, string] => value !== undefined)

  return {
    symbol: normalizeInputSymbol(symbol),
    source: "bithumb",
    bids,
    asks,
    lastUpdateTs: Date.now(),
    depth: Math.max(bids.length, asks.length),
  }
}

async function fetchBithumbKlines(
  symbol: string,
  interval: string,
  fromMs?: number,
  toMs?: number,
  limit = 200,
): Promise<KlineSnapshot[]> {
  assertKrwMarket(symbol)

  const params = new URLSearchParams({
    interval: interval || "24h",
    count: String(Math.max(1, Math.min(limit, 300))),
  })

  if (typeof fromMs === "number" && Number.isFinite(fromMs)) {
    params.set("from", String(Math.max(0, Math.floor(fromMs))))
  }
  if (typeof toMs === "number" && Number.isFinite(toMs)) {
    params.set("to", String(Math.floor(toMs)))
  }

  const payload = await requestJson<z.infer<typeof BITHUMB_KLINE_SCHEMA>>(
    `${BITHUMB_BASE_URL}/public/candlestick/${toBithumbCurrency(symbol)}?${params.toString()}`,
    BITHUMB_KLINE_SCHEMA,
  )

  const rows = Array.isArray(payload) ? payload : payload.data
  if (!Array.isArray(rows)) return []

  return parseKlinesFromPayload(rows).slice(0, Math.max(1, limit)).map((row) => ({
    symbol: normalizeInputSymbol(symbol),
    source: "bithumb",
    interval,
    open: row.open,
    high: row.high,
    low: row.low,
    close: row.close,
    volume: row.volume,
    ts: row.ts,
  }))
}

async function fetchBithumbMarketCached(symbols?: string[]): Promise<MarketSnapshot[]> {
  const normalized = symbols?.map((symbol) => normalizeCanonicalSymbol(symbol))
  const key = `bithumb:markets:${normalized?.join(",") ?? "all"}`
  return cached(key, BITHUMB_CACHE_TTL_MS, () => fetchBithumbMarket(normalized))
}

export const bithumbAdapter: IExchangeApiAdapter = {
  name: "bithumb",
  supports: (capability) => ["market", "orderbook", "kline"].includes(capability),
  fetchMarketSnapshot: (symbols) => fetchBithumbMarketCached(symbols),
  fetchOrderBook: (symbol) => fetchBithumbOrderbook(symbol),
  fetchKlines: (symbol, interval, fromMs, toMs, limit) =>
    fetchBithumbKlines(symbol, interval, fromMs, toMs, limit),
  fetchDerivatives: async () => null,
  fetchMeta: async () => null,
}
