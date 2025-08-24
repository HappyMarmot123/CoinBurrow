export interface Market {
  market: string;
  korean_name: string;
  english_name: string;
  market_event: {
    warning: boolean;
    caution: {
      PRICE_FLUCTUATIONS: boolean;
      TRADING_VOLUME_SOARING: boolean;
      DEPOSIT_AMOUNT_SOARING: boolean;
      GLOBAL_PRICE_DIFFERENCES: boolean;
      CONCENTRATION_OF_SMALL_ACCOUNTS: boolean;
    };
  };
}

export interface CandleDto {
  market: string; // 마켓명
  candle_date_time_utc: string; // 캔들 기준 시각(UTC)
  candle_date_time_kst: string; // 캔들 기준 시각(KST)
  opening_price: number; // 시가
  high_price: number; // 고가
  low_price: number; // 저가
  trade_price: number; // 종가
  timestamp: number; // 해당 캔들의 타임스탬프
  candle_acc_trade_price: number; // 누적 거래 금액
  candle_acc_trade_volume: number; // 누적 거래량
  unit: number; // 분 단위
}

export interface OrderbookUnit {
  ask_price: number; // 매도호가
  bid_price: number; // 매수호가
  ask_size: number; // 매도잔량
  bid_size: number; // 매수잔량
}

export interface OrderbookDto {
  market: string; // 종목 코드
  timestamp: number; // 타임스탬프
  total_ask_size: number; // 호가 매도 총 잔량
  total_bid_size: number; // 호가 매수 총 잔량
  orderbook_units: OrderbookUnit[]; // 호가
}

export interface TickerDto {
  market: string; // 종목 코드
  trade_date: string; // 최근 거래 일자(UTC)
  trade_time: string; // 최근 거래 시각(UTC)
  trade_date_kst: string; // 최근 거래 일자(KST)
  trade_time_kst: string; // 최근 거래 시각(KST)
  trade_timestamp: number; // 최근 거래 타임스탬프
  opening_price: number; // 시가
  high_price: number; // 고가
  low_price: number; // 저가
  trade_price: number; // 종가(현재가)
  prev_closing_price: number; // 전일 종가
  change: "RISE" | "EVEN" | "FALL"; // 전일 대비 상태
  change_price: number; // 전일 대비 값
  change_rate: number; // 전일 대비 등락률
  signed_change_price: number; // 부호 있는 전일 대비 값
  signed_change_rate: number; // 부호 있는 전일 대비 등락률
  trade_volume: number; // 가장 최근 거래량
  acc_trade_price: number; // 24시간 누적 거래대금
  acc_trade_price_24h: number; // 24시간 누적 거래대금
  acc_trade_volume: number; // 24시간 누적 거래량
  acc_trade_volume_24h: number; // 24시간 누적 거래량
  highest_52_week_price: number; // 52주 신고가
  highest_52_week_date: string; // 52주 신고가 달성일
  lowest_52_week_price: number; // 52주 신저가
  lowest_52_week_date: string; // 52주 신저가 달성일
  timestamp: number; // 타임스탬프
}
