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

export function toBinanceSymbol(raw: string): string {
  const parsed = parseCanonicalSymbol(raw)
  return `${parsed.base}${parsed.quote}`
}

export function toBybitSymbol(raw: string): string {
  return toBinanceSymbol(raw)
}
