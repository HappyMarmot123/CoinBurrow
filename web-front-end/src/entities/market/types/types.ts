export interface Market {
  market: string;
  korean_name: string;
}

export interface Ticker {
  code: string; // market code
  trade_price: number;
  signed_change_rate: number;
  signed_change_price: number;
  acc_trade_price_24h: number;
  change: "RISE" | "FALL" | "EVEN";
}
