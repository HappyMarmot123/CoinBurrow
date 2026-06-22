import { TARGET_COINS } from "../upbit/constants.js"

export interface CanonicalSymbol {
  base: string
  quote: string
  text: string
}

const symbolDelimiters = ["-", "/", "_"]

function parseCanonicalSymbol(raw: string): CanonicalSymbol {
  const trimmed = raw.trim()
  if (trimmed.length === 0) {
    throw new Error(`invalid symbol: "${raw}"`)
  }

  let delimiter: string | undefined

  for (const candidate of symbolDelimiters) {
    if (trimmed.includes(candidate)) {
      delimiter = candidate
      break
    }
  }

  const [base, quote] = delimiter
    ? trimmed.split(delimiter)
    : [trimmed, "KRW"]

  if (!base || !quote) {
    throw new Error(`invalid symbol: "${raw}"`)
  }

  return {
    base: base.toUpperCase(),
    quote: quote.toUpperCase(),
    text: `${base.toUpperCase()}/${quote.toUpperCase()}`,
  }
}

export function toCanonicalSymbol(raw: string): string {
  return parseCanonicalSymbol(raw).text
}

export function toSymbolsFromList(values: string): string[] {
  const symbols = values
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item.length > 0)

  const canonical = new Set<string>()
  for (const symbol of symbols) {
    canonical.add(toCanonicalSymbol(symbol))
  }

  return [...canonical]
}

export function toBinanceSymbol(raw: string): string {
  const parsed = parseCanonicalSymbol(raw)
  return `${parsed.base}${parsed.quote}`
}

export function toBybitSymbol(raw: string): string {
  return toBinanceSymbol(raw)
}

export function validateNoUpbitOverlap(symbols: string[]): string[] {
  const upbitBases = new Set(
    TARGET_COINS
      .map((market) => market.split("-", 2)[1])
      .map((base) => base?.toUpperCase() ?? ""),
  )
  const result: string[] = []

  for (const symbol of symbols) {
    const parsed = parseCanonicalSymbol(symbol)
    if (upbitBases.has(parsed.base)) {
      continue
    }
    result.push(`${parsed.base}/${parsed.quote}`)
  }

  return result
}

export function normalizeCanonicalSymbol(raw: string): string {
  const parsed = parseCanonicalSymbol(raw)
  return `${parsed.base}/${parsed.quote}`
}
