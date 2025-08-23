export class CandleDto {
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
