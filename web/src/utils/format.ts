const priceFormatter = new Intl.NumberFormat("ko-KR");
const numberFormatter = new Intl.NumberFormat("ko-KR", {
  maximumFractionDigits: 4,
  minimumFractionDigits: 0,
});
const timeFormatter = new Intl.DateTimeFormat("ko-KR", {
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
});

export function formatPrice(value?: number): string {
  if (typeof value !== "number") return "-";
  return priceFormatter.format(Math.round(value));
}

export function formatCompact(value?: number): string {
  if (typeof value !== "number") return "-";
  if (value >= 1_000_000_000_000) return `${(value / 1_000_000_000_000).toFixed(1)}T`;
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)}B`;
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return formatPrice(value);
}

export function formatRate(rate?: number): string {
  if (typeof rate !== "number") return "-";
  return `${(rate * 100).toFixed(2)}%`;
}

export function formatRatio(ratio?: number): string {
  if (typeof ratio !== "number") return "-";
  return `${ratio >= 0 ? "+" : ""}${ratio.toFixed(3)}%`;
}

export function formatNumber(value: number): string {
  return numberFormatter.format(value);
}

export function formatTime(timestamp: number): string {
  return timeFormatter.format(timestamp);
}
