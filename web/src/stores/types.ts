export interface TickerView {
  market: string;
  tradePrice: number;
  signedChangeRate: number;
  accTradePrice24h: number;
  openingPrice?: number;
  highPrice?: number;
  lowPrice?: number;
}

export interface OrderbookUnitView {
  askPrice: number;
  bidPrice: number;
  askSize: number;
  bidSize: number;
}

export interface OrderbookView {
  market: string;
  timestamp: number;
  units: OrderbookUnitView[];
}

export interface CandleView {
  market: string;
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface TradeView {
  market: string;
  price: number;
  volume: number;
  side: "ASK" | "BID";
  timestamp: number;
}

export interface MarketView {
  market: string;
  koreanName: string;
  englishName: string;
}

export type NewsSentiment = "positive" | "negative" | "neutral" | "unknown";

export interface CryptoNewsArticle {
  id: string;
  title: string;
  url: string;
  source: string;
  publishedAt: number;
  summary?: string;
  language?: string;
  originalLanguage?: string;
  assets: string[];
  categories: string[];
  sentiment: NewsSentiment;
  imageUrl?: string;
  provider: "cryptocurrency.cv";
  isStale?: boolean;
}

export interface CryptoNewsResponse {
  articles: CryptoNewsArticle[];
  nextCursor?: string;
  fetchedAt: number;
  cacheTtlMs: number;
  provider: string;
  stale: boolean;
  degraded?: boolean;
  degradedReason?: string;
}

export interface CryptoNewsSourceSummary {
  provider: string;
  sources: string[];
  categories: string[];
  languages: string[];
  fetchedAt: number;
  cacheTtlMs: number;
  stale: boolean;
  degraded?: boolean;
  degradedReason?: string;
}

export interface CryptoNewsHealth {
  provider: string;
  status: "healthy" | "degraded" | "unavailable";
  checkedAt: number;
  responseTimeMs?: number;
  upstream?: unknown;
  cache: {
    ttlMs: number;
    staleTtlMs: number;
  };
}
