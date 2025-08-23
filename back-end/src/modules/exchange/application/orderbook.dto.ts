class OrderbookUnit {
  ask_price: number; // 매도호가
  bid_price: number; // 매수호가
  ask_size: number; // 매도잔량
  bid_size: number; // 매수잔량
}

export class OrderbookDto {
  market: string; // 종목 코드
  timestamp: number; // 타임스탬프
  total_ask_size: number; // 호가 매도 총 잔량
  total_bid_size: number; // 호가 매수 총 잔량
  orderbook_units: OrderbookUnit[]; // 호가
}
