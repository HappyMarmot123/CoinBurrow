import type {
  CryptoNewsHealth,
  CryptoNewsResponse,
  CryptoNewsSourceSummary,
  MarketView,
  CandleView,
  TickerView,
  OrderbookView,
  TradeView,
} from "../stores/types.js";
import { TIMEFRAME_LABELS } from "../constants/candle.js";

export type CandleTimeframe =
  | "1s"
  | "1m"
  | "3m"
  | "5m"
  | "10m"
  | "15m"
  | "30m"
  | "60m"
  | "240m"
  | "1h"
  | "4h"
  | "1d"
  | "1w"
  | "1mo"
  | "1M"
  | "1y";

export interface CandleQueryOptions {
  timeframe?: CandleTimeframe;
  count?: number;
  to?: string;
}

export interface OrderbookQueryOptions {
  level?: number;
}

export interface TradeQueryOptions {
  count?: number;
  to?: string;
  daysAgo?: number;
}

export interface MarketStatusView {
  market?: string;
  code?: string;
  warning?: boolean;
  caution?: Record<string, boolean>;
  market_warning?: unknown;
  market_warning_message?: string;
  market_event?: string | null;
  trade_currency?: string;
  [key: string]: unknown;
}

export interface ExchangeRateView {
  currency?: string;
  base_currency?: string;
  market?: string;
  rate?: string | number | null;
  base_price?: string | number | null;
  [key: string]: unknown;
}

export interface CoinMetaView {
  coinId: string;
  name: string;
  symbol: string;
  logo?: string;
  category?: string;
  website?: string;
  description?: string;
  tags?: string[];
  whitepaper?: string;
  recentEvents?: string[];
  team?: string[];
  [key: string]: unknown;
}

export interface MarketSummaryView extends MarketView {
  quote: string;
  [key: string]: unknown;
}

export interface QuoteSummaryView {
  quote: string;
  marketCount: number;
}

export interface MarketOverviewItem {
  market: string;
  ticker: TickerView | null;
  orderbook: OrderbookView | null;
  status: MarketStatusView | null;
}

export interface NewsQueryOptions {
  q?: string;
  asset?: string;
  category?: string;
  language?: "all" | "ko" | "en";
  source?: string;
  limit?: number;
  cursor?: string;
}

export interface CoinMetaQueryOptions {
  coinId: string;
}

export interface DerivativesView {
  symbol: string;
  source: string;
  openInterest?: string;
  fundingRate?: string;
  ts: number;
}

export interface FreeApiRequestPolicy {
  timeoutMs: number;
  maxRetries: number;
  retryDelaysMs: number[];
}

export interface FreeApiProviderPolicy {
  provider: string;
  capability: "meta";
  cacheTtlMs: number;
  staleCacheTtlMs?: number;
  requestPolicy: FreeApiRequestPolicy;
}

export interface FreeApiPolicyResponse {
  generatedAt: number;
  policies: FreeApiProviderPolicy[];
}

type QueryValue = string | number | boolean | undefined;
type QueryParams = Record<string, QueryValue>;

const UPBIT_HOST_PATTERN = /^https?:\/\/(?:www\.)?api\.upbit\.com/i;
const API_ORIGIN = import.meta.env.VITE_API_ORIGIN?.trim().replace(/\/+$/, "");

async function getJson<T>(url: string): Promise<T> {
  const endpoint = API_ORIGIN && !UPBIT_HOST_PATTERN.test(API_ORIGIN)
    ? `${API_ORIGIN}${url}`
    : url;
  const response = await fetch(endpoint);

  if (!response.ok) {
    throw new Error(`failed to load ${url}; status ${response.status}`);
  }

  return (await response.json()) as T;
}

function normalizeQueryValue(value: QueryValue): string {
  if (typeof value === "number") {
    return String(value);
  }
  if (typeof value === "boolean") {
    return value ? "true" : "false";
  }
  return value ?? "";
}

function buildQueryParams(entries: QueryParams): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(entries)) {
    const normalized = normalizeQueryValue(value);
    if (normalized.trim().length > 0) {
      params.set(key, normalized);
    }
  }
  return params.toString();
}

function buildPath(path: string, query: QueryParams): string {
  const queryString = buildQueryParams(query);
  return queryString ? `${path}?${queryString}` : path;
}

function normalizeMarketInput(raw: unknown): string {
  if (typeof raw !== "string") {
    return "";
  }
  return raw.trim();
}

function normalizeMarkets(markets: string[]): string[] {
  return [...new Set(
    markets
      .map(normalizeMarketInput)
      .filter((market) => market.length > 0),
  )];
}

export const getCoinList = async (
  options: { quote?: string; isDetails?: boolean } = {},
): Promise<MarketView[]> => {
  return getJson<MarketView[]>(buildPath("/market/coin-list", {
    quote: options.quote,
    isDetails: options.isDetails ?? false,
  }));
};

export const getAvailableQuotes = async (): Promise<QuoteSummaryView[]> => {
  return getJson<QuoteSummaryView[]>("/market/exchange/quotes");
};

export const getMarketOverview = async (markets: string[]): Promise<MarketOverviewItem[]> => {
  return getJson<MarketOverviewItem[]>(
    buildPath("/market/exchange/market-overview", {
    markets: normalizeMarkets(markets).join(","),
  }));
};

export const getMarketSummaries = async (
  options: { quote?: string; isDetails?: boolean } = {},
): Promise<MarketSummaryView[]> => {
  return getJson<MarketSummaryView[]>(buildPath("/market/exchange/markets", {
    quote: options.quote,
    isDetails: options.isDetails ?? true,
  }));
};

export const getTickersByMarkets = async (markets: string[]): Promise<TickerView[]> => {
  return getJson<TickerView[]>(
    buildPath("/market/exchange/tickers", {
      markets: normalizeMarkets(markets).join(","),
    }),
  );
};

export const getTickerSnapshot = () => getJson<TickerView[]>("/market/exchange/ticker");

export const getCandles = async (
  market: string,
  options: CandleQueryOptions = {},
): Promise<CandleView[]> => {
  return getJson<CandleView[]>(buildPath("/market/exchange/candle", {
    market,
    timeframe: options.timeframe,
    count: options.count,
    to: options.to,
  }));
};

export const getOrderbookSnapshot = async (
  market: string,
  options: OrderbookQueryOptions = {},
): Promise<OrderbookView[]> => {
  return getJson<OrderbookView[]>(buildPath("/market/exchange/orderbook", {
    market,
    level: options.level,
  }));
};

export const getOrderbookSnapshots = async (
  markets: string[],
  options: OrderbookQueryOptions = {},
): Promise<OrderbookView[]> => {
  if (!markets.length) {
    return [];
  }

  return getJson<OrderbookView[]>(
    buildPath("/market/exchange/orderbook", {
      markets: normalizeMarkets(markets).join(","),
      level: options.level,
    }),
  );
};

export const getTradeSnapshot = async (
  market: string,
  options: TradeQueryOptions = {},
): Promise<TradeView[]> => {
  return getJson<TradeView[]>(buildPath("/market/exchange/trade-ticks", {
    market,
    count: options.count,
    to: options.to,
    daysAgo: options.daysAgo,
  }));
};

export const getMarketStatus = async (
  markets?: string[],
): Promise<MarketStatusView[]> => {
  return getJson<MarketStatusView[]>(
    buildPath("/market/exchange/market-status", {
      markets: markets ? normalizeMarkets(markets).join(",") : "",
    }),
  );
};

export const getExchangeRates = async (): Promise<ExchangeRateView[]> => {
  try {
    return await getJson<ExchangeRateView[]>("/market/exchange/exchange-rates");
  } catch {
    return [];
  }
};

export const getNewsArticles = async (
  options: NewsQueryOptions = {},
): Promise<CryptoNewsResponse> => {
  return getJson<CryptoNewsResponse>(buildPath("/market/news/articles", {
    q: options.q,
    asset: options.asset,
    category: options.category,
    language: options.language,
    source: options.source,
    limit: options.limit,
    cursor: options.cursor,
  }));
};

export const getNewsSources = async (): Promise<CryptoNewsSourceSummary> => {
  return getJson<CryptoNewsSourceSummary>("/market/news/sources");
};

export const getNewsHealth = async (): Promise<CryptoNewsHealth> => {
  return getJson<CryptoNewsHealth>("/market/news/health");
};

export const getCoinMetaByProvider = async (
  provider: "coingecko" | "coinpaprika",
  options: CoinMetaQueryOptions,
): Promise<CoinMetaView> => {
  return getJson<CoinMetaView>(`/market/freeapi/${provider}/meta${buildPath("", {
    coinId: options.coinId,
  })}`);
};

export const getDerivativesBySymbol = async (
  symbol: string,
  category: "spot" | "linear" | "inverse" = "linear",
): Promise<DerivativesView> => {
  return getJson<DerivativesView>(`/market/freeapi/bybit/derivatives${buildPath("", {
    symbol,
    category,
  })}`);
};

export const getCoinMeta = async (
  coingeckoCoinId: string,
  coinpaprikaCoinId?: string,
): Promise<CoinMetaView | null> => {
  try {
    return await getCoinMetaByProvider("coingecko", { coinId: coingeckoCoinId });
  } catch {
    if (!coinpaprikaCoinId) {
      return null;
    }

    try {
      return await getCoinMetaByProvider("coinpaprika", { coinId: coinpaprikaCoinId });
    } catch {
      return null;
    }
  }
};

export const getFreeApiPolicy = async (): Promise<FreeApiPolicyResponse> => {
  return getJson<FreeApiPolicyResponse>("/market/freeapi/policy");
};

export const getCoinListWithFallback = async (): Promise<MarketView[]> => {
  return getCoinList();
};

export { TIMEFRAME_LABELS };
