export function normalizeQuote(quote: string | undefined): string | undefined {
  return quote?.trim().toUpperCase()
}

export function normalizeMarkets(value: string[] | string | undefined): string[] {
  const source = Array.isArray(value) ? value : (value ?? '').split(',')
  return [...new Set(
    source
      .map((market) => market.trim())
      .filter((market) => market.length > 0),
  )]
}
