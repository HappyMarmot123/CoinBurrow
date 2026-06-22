export const NEWS_ASSET_FILTERS = [
  { value: "ALL", label: "전체" },
  { value: "BTC", label: "Bitcoin" },
  { value: "ETH", label: "Ethereum" },
  { value: "SOL", label: "Solana" },
  { value: "XRP", label: "XRP" },
  { value: "DEFI", label: "DeFi" },
] as const;

export const NEWS_PAGE_SIZE = 20;
export const NEWS_REFRESH_INTERVAL_MS = 300_000;
