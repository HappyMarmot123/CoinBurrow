import type { MarketView, CandleView, TickerView, OrderbookView, TradeView } from "../stores/types.js";

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

function normalizeCautionFlags(raw: unknown): Record<string, boolean> {
  if (!raw || typeof raw !== "object") {
    return {};
  }

  const entries = Object.entries(raw as Record<string, unknown>)
    .filter(([, value]) => typeof value === "boolean")
    .map(([key, value]) => [key, value] as const);

  return Object.fromEntries(entries) as Record<string, boolean>;
}

export interface ExchangeRateView {
  currency?: string;
  base_currency?: string;
  market?: string;
  rate?: string | number | null;
  base_price?: string | number | null;
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

const TIMEFRAME_LABELS: Readonly<Record<CandleTimeframe, string>> = {
  "1s": "1s",
  "1m": "1m",
  "3m": "3m",
  "5m": "5m",
  "10m": "10m",
  "15m": "15m",
  "30m": "30m",
  "60m": "60m",
  "240m": "240m",
  "1h": "1h",
  "4h": "4h",
  "1d": "1d",
  "1w": "1w",
  "1mo": "1M",
  "1M": "1M",
  "1y": "1Y",
};

type QueryValue = string | number | boolean | undefined;
type QueryParams = Record<string, QueryValue>;

const UPBIT_REST_BASE = "https://api.upbit.com/v1";
const UPBIT_HOST_PATTERN = /^https?:\/\/(?:www\.)?api\.upbit\.com/i;
const API_ORIGIN = import.meta.env.VITE_API_ORIGIN?.trim().replace(/\/+$/, "");

const CANDLE_FALLBACK_PATH: Readonly<Record<CandleTimeframe, string>> = {
  "1s": "/candles/seconds/1",
  "1m": "/candles/minutes/1",
  "3m": "/candles/minutes/3",
  "5m": "/candles/minutes/5",
  "10m": "/candles/minutes/10",
  "15m": "/candles/minutes/15",
  "30m": "/candles/minutes/30",
  "60m": "/candles/minutes/60",
  "240m": "/candles/minutes/240",
  "1h": "/candles/minutes/60",
  "4h": "/candles/minutes/240",
  "1d": "/candles/days",
  "1w": "/candles/weeks",
  "1mo": "/candles/months",
  "1M": "/candles/months",
  "1y": "/candles/years/1",
};

interface UpbitMarketRow {
  market: string;
  korean_name: string;
  english_name: string;
  [key: string]: unknown;
}

async function getJson<T>(url: string): Promise<T> {
  const candidates = new Set<string>();

  if (API_ORIGIN && !UPBIT_HOST_PATTERN.test(API_ORIGIN)) {
    candidates.add(`${API_ORIGIN}${url}`);
  }

  candidates.add(url);
  if (!url.startsWith("/api/")) {
    candidates.add(`/api${url}`);
  }

  const attempts: string[] = [];

  for (const candidate of candidates) {
    attempts.push(candidate);
    try {
      const response = await fetch(candidate);
      if (response.ok) {
        return (await response.json()) as T;
      }
    } catch {
      // Continue to next endpoint.
    }
  }

  throw new Error(`failed to load ${url}; attempted ${attempts.join(", ")}`);
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

async function getJsonFromUpbit<T>(path: string, query: QueryParams = {}): Promise<T> {
  const response = await fetch(buildUpbitUrl(path, query));
  if (!response.ok) {
    throw new Error(`Upbit ${path} -> ${response.status}`);
  }
  return response.json() as Promise<T>;
}

function buildUpbitUrl(path: string, query: QueryParams = {}): string {
  const queryString = buildQueryParams(query);
  return `${UPBIT_REST_BASE}${path}${queryString ? `?${queryString}` : ""}`;
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

function normalizeQuote(value?: string): string | undefined {
  return value?.trim().toUpperCase();
}

function isMarketRow(row: unknown): row is UpbitMarketRow {
  return (
    row !== null &&
    typeof row === "object" &&
    typeof (row as { market?: unknown }).market === "string" &&
    typeof (row as { korean_name?: unknown }).korean_name === "string" &&
    typeof (row as { english_name?: unknown }).english_name === "string"
  );
}

function mapMarketList(raw: unknown): MarketView[] {
  if (!Array.isArray(raw)) {
    throw new Error("Unexpected /market/all response shape");
  }

  return raw
    .filter(isMarketRow)
    .map((item) => ({
      market: item.market,
      koreanName: item.korean_name,
      englishName: item.english_name,
    }));
}

function filterMarketsByQuote(markets: MarketView[], quote?: string): MarketView[] {
  const normalized = normalizeQuote(quote);
  if (!normalized) {
    return markets;
  }
  return markets.filter((market) => market.market.startsWith(`${normalized}-`));
}

function mapMarketSummary(raw: unknown, quoteFilter?: string): MarketSummaryView[] {
  const normalizedQuote = normalizeQuote(quoteFilter);

  if (!Array.isArray(raw)) {
    throw new Error("Unexpected /market/all response shape");
  }

  return raw
    .filter(isMarketRow)
    .filter(
      (item) => !normalizedQuote || item.market.startsWith(`${normalizedQuote}-`),
    )
    .map((item): MarketSummaryView => ({
      ...item,
      market: item.market,
      koreanName: item.korean_name,
      englishName: item.english_name,
      quote: item.market.split("-", 2)[0] ?? "",
    }));
}

function mapCandles(raw: unknown, market: string): CandleView[] {
  if (!Array.isArray(raw)) {
    throw new Error(`Unexpected candle payload for ${market}`);
  }

  return raw
    .filter(
      (candle) =>
        typeof candle === "object" &&
        candle !== null &&
        typeof (candle as { timestamp: unknown }).timestamp === "number" &&
        typeof (candle as { opening_price: unknown }).opening_price === "number" &&
        typeof (candle as { high_price: unknown }).high_price === "number" &&
        typeof (candle as { low_price: unknown }).low_price === "number" &&
        typeof (candle as { trade_price: unknown }).trade_price === "number" &&
        typeof (candle as { candle_acc_trade_volume: unknown }).candle_acc_trade_volume === "number",
    )
    .map((candle) => {
      const row = candle as {
        timestamp: number;
        opening_price: number;
        high_price: number;
        low_price: number;
        trade_price: number;
        candle_acc_trade_volume: number;
      };
      return {
        market,
        timestamp: row.timestamp,
        open: row.opening_price,
        high: row.high_price,
        low: row.low_price,
        close: row.trade_price,
        volume: row.candle_acc_trade_volume,
      };
    });
}

function mapOrderbook(raw: unknown, market: string): OrderbookView[] {
  if (!Array.isArray(raw)) {
    throw new Error(`Unexpected orderbook payload for ${market}`);
  }

  return raw
    .filter((entry) => typeof entry === "object" && entry !== null)
    .map((entry) => {
      const item = entry as {
        market: string;
        timestamp: number;
        orderbook_units?: Array<{
          ask_price: number;
          bid_price: number;
          ask_size: number;
          bid_size: number;
        }>;
      };

      return {
        market: item.market ?? market,
        timestamp: typeof item.timestamp === "number" ? item.timestamp : Date.now(),
        units:
          item.orderbook_units?.map((unit) => ({
            askPrice: unit.ask_price,
            bidPrice: unit.bid_price,
            askSize: unit.ask_size,
            bidSize: unit.bid_size,
          })) ?? [],
      };
    });
}

function mapTrades(raw: unknown, market: string): TradeView[] {
  if (!Array.isArray(raw)) {
    throw new Error(`Unexpected trade payload for ${market}`);
  }

  return raw
    .filter(
      (trade) =>
        typeof trade === "object" &&
        trade !== null &&
        typeof (trade as { trade_price: unknown }).trade_price === "number" &&
        typeof (trade as { trade_volume: unknown }).trade_volume === "number" &&
        typeof (trade as { ask_bid: unknown }).ask_bid === "string" &&
        ((trade as { ask_bid: "ASK" | "BID" }).ask_bid === "ASK" ||
          (trade as { ask_bid: "ASK" | "BID" }).ask_bid === "BID"),
    )
    .map((trade) => {
      const item = trade as {
        trade_price: number;
        trade_volume: number;
        ask_bid: "ASK" | "BID";
        timestamp: number;
        market?: string;
      };
      return {
        market: item.market ?? market,
        price: item.trade_price,
        volume: item.trade_volume,
        side: item.ask_bid,
        timestamp: item.timestamp,
      };
    });
}

function mapMarketStatus(raw: unknown): MarketStatusView[] {
  if (!Array.isArray(raw)) {
    throw new Error("Unexpected /market/status response shape");
  }

  return raw
    .filter((row) => typeof row === "object" && row !== null)
    .map((row) => {
      const item = row as MarketStatusView;
      const market =
        typeof item.market === "string"
          ? item.market
          : typeof item.code === "string"
            ? item.code
            : "";
      return {
        ...item,
        market,
        caution: normalizeCautionFlags((item as { caution?: unknown }).caution),
      };
    })
    .filter((item) => item.market.length > 0);
}

function mapExchangeRates(raw: unknown): ExchangeRateView[] {
  if (!Array.isArray(raw)) {
    throw new Error("Unexpected /exchange-rates response shape");
  }

  return raw
    .filter((row) => typeof row === "object" && row !== null)
    .map((row) => row as ExchangeRateView);
}

export const getCoinList = async (
  options: { quote?: string; isDetails?: boolean } = {},
): Promise<MarketView[]> => {
  try {
    const path = buildPath("/market/coin-list", {
      quote: options.quote,
      isDetails: options.isDetails ?? false,
    });
    return filterMarketsByQuote(await getJson<MarketView[]>(path), options.quote);
  } catch {
    const fallbackRaw = await getJsonFromUpbit<unknown[]>(
      "/market/all",
      {
        isDetails: false,
      },
    );
    return filterMarketsByQuote(mapMarketList(fallbackRaw), options.quote);
  }
};

export const getAvailableQuotes = async (): Promise<QuoteSummaryView[]> => {
  try {
    return await getJson<QuoteSummaryView[]>("/market/exchange/quotes");
  } catch {
    const list = await getCoinList({ isDetails: true });
    const quoteCounts = new Map<string, number>();

    list.forEach((item) => {
      const quote = item.market.split("-", 2)[0];
      if (quote) {
        quoteCounts.set(quote, (quoteCounts.get(quote) ?? 0) + 1);
      }
    });

    return [...quoteCounts.entries()]
      .sort(([quoteA, countA], [quoteB, countB]) => {
        if (countB !== countA) {
          return countB - countA;
        }
        if (quoteA === "KRW" && quoteB !== "KRW") {
          return -1;
        }
        if (quoteB === "KRW" && quoteA !== "KRW") {
          return 1;
        }
        return quoteA.localeCompare(quoteB);
      })
      .map(([quote, marketCount]) => ({ quote, marketCount }));
  }
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
  const path = buildPath("/market/exchange/markets", {
    quote: options.quote,
    isDetails: options.isDetails ?? true,
  });
  try {
    return await getJson<MarketSummaryView[]>(path);
  } catch {
    const fallbackRaw = await getJsonFromUpbit<unknown[]>(
      "/market/all",
      {
        isDetails: true,
      },
    );
    return mapMarketSummary(fallbackRaw, options.quote);
  }
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
  const path = buildPath("/market/exchange/candle", {
    market,
    timeframe: options.timeframe,
    count: options.count,
    to: options.to,
  });

  try {
    return await getJson<CandleView[]>(path);
  } catch {
    const timeframe = options.timeframe ?? "1m";
    const normalizedTimeframe = timeframe === "1M" ? "1mo" : timeframe;
    const fallbackRaw = await getJsonFromUpbit<unknown[]>(
      CANDLE_FALLBACK_PATH[normalizedTimeframe as CandleTimeframe],
      {
        market,
        count: options.count ?? 200,
        to: options.to,
      },
    );
    return mapCandles(fallbackRaw, market);
  }
};

export const getOrderbookSnapshot = async (
  market: string,
  options: OrderbookQueryOptions = {},
): Promise<OrderbookView[]> => {
  const path = buildPath("/market/exchange/orderbook", {
    market,
    level: options.level,
  });

  try {
    return await getJson<OrderbookView[]>(path);
  } catch {
    const fallbackRaw = await getJsonFromUpbit<unknown[]>(
      "/orderbook",
      {
        markets: market,
        level: options.level,
      },
    );
    return mapOrderbook(fallbackRaw, market);
  }
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
  const path = buildPath("/market/exchange/trade-ticks", {
    market,
    count: options.count,
    to: options.to,
  });

  try {
    return await getJson<TradeView[]>(path);
  } catch {
    const fallbackRaw = await getJsonFromUpbit<unknown[]>(
      "/trades/ticks",
      {
        market,
        count: options.count ?? 50,
        to: options.to,
      },
    );
    return mapTrades(fallbackRaw, market);
  }
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

export const getCoinListWithFallback = async (): Promise<MarketView[]> => {
  return getCoinList();
};

export { TIMEFRAME_LABELS };
