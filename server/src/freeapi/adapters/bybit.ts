import { z } from "zod"

import { FreeApiError } from "../errors.js"
import { parseNumericString, requestJson } from "../http.js"
import { toBybitSymbol } from "../symbols.js"
import type {
  DerivativesSnapshot,
  IExchangeApiAdapter,
  OrderBookSnapshot,
} from "../types.js"

const BYBIT_BASE_URL = "https://api.bybit.com"
const BYBIT_CATEGORIES = ["spot", "linear", "inverse"] as const
type BybitCategory = (typeof BYBIT_CATEGORIES)[number]

const BYBIT_RESPONSE_SCHEMA = z.object({
  retCode: z.number(),
  retMsg: z.string().optional(),
  result: z.record(z.unknown()),
})

interface BybitRecord {
  symbol?: unknown
  openInterest?: unknown
  fundingRate?: unknown
  fundingRateTimestamp?: unknown
  timestamp?: unknown
}

function normalizeSymbol(raw: string): string {
  const trimmed = raw.trim().toUpperCase()
  if (trimmed.includes("/")) return trimmed
  return trimmed.replace("-", "/")
}

function extractRows(payload: z.output<typeof BYBIT_RESPONSE_SCHEMA>): unknown[] {
  const result = payload.result as Record<string, unknown>
  const list = result?.list
  if (Array.isArray(list)) return list

  const rows = result?.data
  if (Array.isArray(rows)) return rows

  return []
}

function parseOpenInterestPayload(payload: z.output<typeof BYBIT_RESPONSE_SCHEMA>): string | undefined {
  const rows = extractRows(payload)
  const candidate = rows.find((row) => {
    if (!row || typeof row !== "object") return false
    const typed = row as BybitRecord
    const openInterest = parseNumericStringFromAny(typed.openInterest)
    return openInterest !== undefined
  }) as { openInterest?: unknown } | undefined

  if (!candidate || typeof candidate.openInterest === "undefined") {
    return undefined
  }

  return parseNumericString(candidate.openInterest)
}

function parseFundingPayload(payload: z.output<typeof BYBIT_RESPONSE_SCHEMA>): string | undefined {
  const rows = extractRows(payload)
  const candidate = rows.find((row) => {
    if (!row || typeof row !== "object") return false
    const typed = row as BybitRecord
    const fundingRate = parseNumericStringFromAny(typed.fundingRate)
    return fundingRate !== undefined
  }) as { fundingRate?: unknown } | undefined

  if (!candidate || typeof candidate.fundingRate === "undefined") {
    return undefined
  }

  return parseNumericString(candidate.fundingRate)
}

function parseTimestampFromPayload(payload: z.output<typeof BYBIT_RESPONSE_SCHEMA>): number {
  const rows = extractRows(payload)
  const candidate = rows.find((row) => {
    if (!row || typeof row !== "object") return false
    const typed = row as BybitRecord
    return parseNumberOrStringFromAny(typed.fundingRateTimestamp) !== undefined
      || parseNumberOrStringFromAny(typed.timestamp) !== undefined
  }) as BybitRecord | undefined

  if (!candidate) return Date.now()

  const explicit = parseNumberOrStringFromAny(candidate.fundingRateTimestamp)
  if (explicit !== undefined) return explicit

  const fallback = parseNumberOrStringFromAny(candidate.timestamp)
  return fallback !== undefined ? fallback : Date.now()
}

async function fetchBybitDerivatives(
  symbol: string,
  category: BybitCategory,
): Promise<DerivativesSnapshot | null> {
  const target = toBybitSymbol(symbol)
  const params = new URLSearchParams({
    category,
    symbol: target,
  })
  const fundingParams = new URLSearchParams({
    category,
    symbol: target,
    limit: "1",
  })

  const [openInterestPayload, fundingPayload] = await Promise.all([
    requestJson(`${BYBIT_BASE_URL}/v5/market/open-interest?${params.toString()}`, BYBIT_RESPONSE_SCHEMA),
    requestJson(
      `${BYBIT_BASE_URL}/v5/market/funding/history?${fundingParams.toString()}`,
      BYBIT_RESPONSE_SCHEMA,
    ),
  ])

  assertSuccessfulResponse(openInterestPayload)
  assertSuccessfulResponse(fundingPayload)

  const openInterest = parseOpenInterestPayload(openInterestPayload)
  const fundingRate = parseFundingPayload(fundingPayload)
  if (!openInterest && !fundingRate) return null

  return {
    symbol: normalizeSymbol(symbol),
    source: "bybit",
    openInterest,
    fundingRate,
    ts: parseTimestampFromPayload(fundingPayload),
  }
}

function parseNumericStringFromAny(value: unknown): string | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return parseNumericString(value)
  if (typeof value === "string" && value.trim().length > 0) return parseNumericString(value)
  return undefined
}

function parseNumberOrStringFromAny(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value
  if (typeof value === "string") {
    const parsed = Number(value.trim())
    if (Number.isFinite(parsed)) return parsed
  }
  return undefined
}

function assertSuccessfulResponse(payload: z.output<typeof BYBIT_RESPONSE_SCHEMA>): void {
  if (payload.retCode === 0) return

  const code = payload.retCode
  const message = payload.retMsg ?? "upstream error"
  throw new FreeApiError(`Bybit API error: ${message}`, "UPSTREAM_ERROR", {
    status: code,
    retryable: code !== 10001,
  })
}

export const bybitAdapter: IExchangeApiAdapter = {
  name: "bybit",
  supports: (capability) => capability === "derivatives",
  fetchMarketSnapshot: async () => [],
  fetchOrderBook: async () => {
    throw new FreeApiError("orderbook not supported", "INVALID_SYMBOL", { retryable: false })
  },
  fetchKlines: async () => [],
  fetchDerivatives: (symbol, category = "linear") => {
    const normalized = (category as BybitCategory) ?? "linear"
    if (!BYBIT_CATEGORIES.includes(normalized)) {
      throw new FreeApiError(`unsupported category: ${category}`, "INVALID_SYMBOL", { retryable: false })
    }
    return fetchBybitDerivatives(symbol, normalized)
  },
  fetchMeta: async () => null,
}
