export interface BinancePriceUpdate {
  symbol: string; // 업비트 매칭용 대문자 (예: BTCUSDT)
  price: number;
}

export interface BinanceWorkerCommand {
  type: "subscribe" | "unsubscribe";
  symbols: string[]; // 대문자 심볼 (예: ["BTCUSDT"])
}

export type BinanceWorkerResponse =
  | { type: "binance-ticker"; data: BinancePriceUpdate[] }
  | { type: "status"; connected: boolean };

// 심볼 → 바이낸스 결합 스트림 파라미터 (소문자 + @miniTicker)
export function buildStreamParams(symbols: string[]): string[] {
  return symbols
    .map((symbol) => symbol.trim().toLowerCase())
    .filter((symbol) => symbol.length > 0)
    .map((symbol) => `${symbol}@miniTicker`);
}
