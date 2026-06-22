import type { MarketView, CandleView, TickerView, OrderbookView, TradeView } from "../stores/types.js";
import { getJson } from "../shared/http/api-client.js";
import {
  candleViewListSchema,
  marketViewListSchema,
  orderbookViewListSchema,
  tickerViewListSchema,
  tradeViewListSchema,
} from "../shared/validation/schemas/domain/market.js";

export const getCoinList = () => getJson<MarketView[]>("/market/coin-list", marketViewListSchema);
export const getTickerSnapshot = () => getJson<TickerView[]>("/market/exchange/ticker", tickerViewListSchema);
export const getCandles = (market: string) =>
  getJson<CandleView[]>(`/market/exchange/candle?market=${market}`, candleViewListSchema);
export const getOrderbookSnapshot = (market: string) =>
  getJson<OrderbookView[]>(`/market/exchange/orderbook?market=${market}`, orderbookViewListSchema);
export const getTradeSnapshot = (market: string) =>
  getJson<TradeView[]>(`/market/exchange/trade-ticks?market=${market}`, tradeViewListSchema);
