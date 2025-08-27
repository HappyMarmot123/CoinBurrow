/**
 * 거래 체결 정보
 */
export interface TradeTick {
  /**
   * 페어(거래쌍)의 코드
   * @example "KRW-BTC"
   */
  market: string;

  /**
   * 체결 일자 (UTC 기준)
   * @format yyyy-MM-dd
   */
  trade_date_utc: string;

  /**
   * 체결 시각 (UTC 기준)
   * @format HH:mm:ss
   */
  trade_time_utc: string;

  /**
   * 체결 시각의 밀리초단위 타임스탬프
   */
  timestamp: number;

  /**
   * 최근 체결 가격
   */
  trade_price: number;

  /**
   * 최근 거래 수량
   */
  trade_volume: number;

  /**
   * 전일 종가 (UTC 0시 기준)
   */
  prev_closing_price: number;

  /**
   * 전일 종가 대비 가격 변화.
   * "trade_price" - "prev_closing_price"로 계산되며,
   * 현재 종가가 전일 종가보다 얼마나 상승 또는 하락했는지를 나타냅니다.
   *
   * 양수(+): 현재 종가가 전일 종가보다 상승한 경우
   * 음수(-): 현재 종가가 전일 종가보다 하락한 경우
   */
  change_price: number;

  /**
   * 매수/매도 주문 구분
   */
  ask_bid: 'ASK' | 'BID';

  /**
   * 체결의 유일 식별자.
   * 해당 필드는 체결 순서를 보장하지 않습니다.
   */
  sequential_id: number;
}
