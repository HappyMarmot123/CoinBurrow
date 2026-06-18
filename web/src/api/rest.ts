import type { MarketView, CandleView, TickerView, OrderbookView, TradeView } from "../stores/types.js";

async function getJson<T>(url: string): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`${url} -> ${response.status}`);
  }
  return response.json() as Promise<T>;
}

export const getCoinList = () => getJson<MarketView[]>("/market/coin-list");
export const getTickerSnapshot = () => getJson<TickerView[]>("/market/exchange/ticker");
export const getCandles = (market: string) => getJson<CandleView[]>(`/market/exchange/candle?market=${market}`);
export const getOrderbookSnapshot = (market: string) =>
  getJson<OrderbookView[]>(`/market/exchange/orderbook?market=${market}`);
export const getTradeSnapshot = (market: string) =>
  getJson<TradeView[]>(`/market/exchange/trade-ticks?market=${market}`);
