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
