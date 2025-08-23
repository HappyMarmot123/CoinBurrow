export class TickerDto {
  market: string; // 종목 코드
  trade_date: string; // 최근 거래 일자(UTC)
  trade_time: string; // 최근 거래 시각(UTC)
  trade_timestamp: number; // 최근 거래 타임스탬프
  opening_price: number; // 시가
  high_price: number; // 고가
  low_price: number; // 저가
  trade_price: number; // 종가(현재가)
  prev_closing_price: number; // 전일 종가
  change: 'RISE' | 'EVEN' | 'FALL'; // 전일 대비 상태
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
