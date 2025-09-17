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
  type: string; // "candle.1m", "candle.3m" 등
  code: string; // 마켓 코드 (예: KRW-BTC)
  candle_date_time_utc: string; // 캔들 기준 시각(UTC 기준)
  candle_date_time_kst: string; // 캔들 기준 시각(KST 기준)
  opening_price: number; // 시가
  high_price: number; // 고가
  low_price: number; // 저가
  trade_price: number; // 종가
  candle_acc_trade_volume: number; // 누적 거래량
  candle_acc_trade_price: number; // 누적 거래 금액
  timestamp: number; // 타임스탬프 (ms)
  stream_type: "SNAPSHOT" | "REALTIME"; // 스트림 타입
  unit?: number; // 분 단위
}

export interface OrderbookUnit {
  ask_price: number;
  bid_price: number;
  ask_size: number;
  bid_size: number;
}

export interface OrderbookDto {
  type: "orderbook";
  code: string;
  timestamp: number;
  total_ask_size: number;
  total_bid_size: number;
  orderbook_units: OrderbookUnit[];
  stream_type: "SNAPSHOT" | "REALTIME";
}

export interface TickerDto {
  type: "ticker";
  code: string; // 종목 코드
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
  acc_trade_price_24h: number; // 24시간 누적 거래대금
  acc_trade_volume_24h: number; // 24시간 누적 거래량
  highest_52_week_price: number; // 52주 신고가
  highest_52_week_date: string; // 52주 신고가 달성일
  lowest_52_week_price: number; // 52주 신저가
  lowest_52_week_date: string; // 52주 신저가 달성일
  trade_timestamp: number; // 최근 거래 타임스탬프
  timestamp: number; // 타임스탬프
  ask_bid: "ASK" | "BID"; // 매수/매도 구분 (Trade에서 가져옴)
  sequential_id: number; // 체결의 유일 식별자 (Trade에서 가져옴)
  stream_type: "SNAPSHOT" | "REALTIME"; // 스트림 타입
}

// Upbit 웹소켓 Trade 데이터
export interface TradeDto {
  type: "trade";
  code: string;
  trade_price: number; // 체결 가격
  trade_volume: number; // 체결량
  ask_bid: "ASK" | "BID"; // 매수/매도 구분
  sequential_id: number; // 체결의 유일 식별자
  trade_timestamp: number; // 체결 시각 타임스탬프
  timestamp: number; // 타임스탬프
  stream_type: "SNAPSHOT" | "REALTIME"; // 스트림 타입
}

export interface SelectedCoin
  extends Pick<Market, "market" | "korean_name" | "english_name"> {
  market: string;
  korean_name: string;
  english_name: string;
}
