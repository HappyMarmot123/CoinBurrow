import type { MarketView, CandleView, TickerView, OrderbookView, TradeView } from "../stores/types.js";

async function getJson<T>(url: string): Promise<T> {
  const directOrigin = import.meta.env.VITE_API_ORIGIN?.trim().replace(/\/$/, "");
  const candidates = new Set<string>();

  if (directOrigin) {
    candidates.add(`${directOrigin}${url}`);
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

async function getJsonFromUpbit<T>(path: string): Promise<T> {
  const response = await fetch(`https://api.upbit.com/v1${path}`);
  if (!response.ok) {
    throw new Error(`Upbit ${path} -> ${response.status}`);
  }
  return response.json() as Promise<T>;
}

function mapMarketList(raw: unknown): MarketView[] {
  if (!Array.isArray(raw)) {
    throw new Error("Unexpected /market/all response shape");
  }

  return raw
    .filter(
      (market) =>
        typeof market === "object" &&
        market !== null &&
        typeof (market as { market: unknown }).market === "string" &&
        (market as { market: string }).market.startsWith("KRW-") &&
        typeof (market as { korean_name: unknown }).korean_name === "string" &&
        typeof (market as { english_name: unknown }).english_name === "string",
    )
    .map((market) => {
      const item = market as { market: string; korean_name: string; english_name: string };
      return {
        market: item.market,
        koreanName: item.korean_name,
        englishName: item.english_name,
      };
    });
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

export const getCoinList = async (): Promise<MarketView[]> => {
  try {
    return await getJson<MarketView[]>("/market/coin-list");
  } catch {
    const fallbackRaw = await getJsonFromUpbit<unknown[]>(`/market/all?isDetails=false`);
    return mapMarketList(fallbackRaw);
  }
};
export const getTickerSnapshot = () => getJson<TickerView[]>("/market/exchange/ticker");
export const getCandles = async (market: string): Promise<CandleView[]> => {
  try {
    const candles = await getJson<CandleView[]>(`/market/exchange/candle?market=${market}`);
    return candles;
  } catch {
    const fallbackRaw = await getJsonFromUpbit<unknown[]>(`/candles/minutes/1?market=${encodeURIComponent(market)}&count=200`);
    return mapCandles(fallbackRaw, market);
  }
};
export const getOrderbookSnapshot = async (market: string): Promise<OrderbookView[]> => {
  try {
    return await getJson<OrderbookView[]>(`/market/exchange/orderbook?market=${market}`);
  } catch {
    const fallbackRaw = await getJsonFromUpbit<unknown[]>(`/orderbook?markets=${encodeURIComponent(market)}`);
    return mapOrderbook(fallbackRaw, market);
  }
};
export const getTradeSnapshot = async (market: string): Promise<TradeView[]> => {
  try {
    return await getJson<TradeView[]>(`/market/exchange/trade-ticks?market=${market}`);
  } catch {
    const fallbackRaw = await getJsonFromUpbit<unknown[]>(`/trades/ticks?market=${encodeURIComponent(market)}&count=50`);
    return mapTrades(fallbackRaw, market);
  }
};

export const getCoinListWithFallback = async (): Promise<MarketView[]> => {
  return getCoinList();
};
