export function toTradingViewSymbol(
  market: string,
  exchange = "UPBIT",
): string {
  const [quote, base] = market.split("-");
  if (!quote || !base) {
    return `${exchange}:${market.replace("-", "")}`;
  }
  return `${exchange}:${base}${quote}`;
}

export function toTradingViewChartUrl(market: string): string {
  const symbol = toTradingViewSymbol(market);
  return `https://kr.tradingview.com/chart/?symbol=${encodeURIComponent(symbol)}`;
}
