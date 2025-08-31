import {
  IsString,
  IsNumber,
  IsIn,
  IsBoolean,
  IsOptional,
} from 'class-validator';

export class TickerDto {
  @IsString()
  code: string; // 종목 코드 (Upbit 응답 필드명에 맞춤)

  @IsString()
  trade_date: string; // 최근 거래 일자(UTC)

  @IsString()
  trade_time: string; // 최근 거래 시각(UTC)

  @IsOptional()
  @IsString()
  trade_date_kst: string; // 최근 거래 일자(KST)

  @IsOptional()
  @IsString()
  trade_time_kst: string; // 최근 거래 시각(KST)

  @IsNumber()
  trade_timestamp: number; // 최근 거래 타임스탬프

  @IsNumber()
  opening_price: number; // 시가

  @IsNumber()
  high_price: number; // 고가

  @IsNumber()
  low_price: number; // 저가

  @IsNumber()
  trade_price: number; // 종가(현재가)

  @IsNumber()
  prev_closing_price: number; // 전일 종가

  @IsString()
  @IsIn(['RISE', 'EVEN', 'FALL'])
  change: 'RISE' | 'EVEN' | 'FALL'; // 전일 대비 상태

  @IsNumber()
  change_price: number; // 전일 대비 값

  @IsNumber()
  change_rate: number; // 전일 대비 등락률

  @IsNumber()
  signed_change_price: number; // 부호 있는 전일 대비 값

  @IsNumber()
  signed_change_rate: number; // 부호 있는 전일 대비 등락률

  @IsNumber()
  trade_volume: number; // 가장 최근 거래량

  @IsNumber()
  acc_trade_price: number; // 누적 거래대금(UTC 0시 기준)

  @IsNumber()
  acc_trade_price_24h: number; // 24시간 누적 거래대금

  @IsNumber()
  acc_trade_volume: number; // 누적 거래량(UTC 0시 기준)

  @IsNumber()
  acc_trade_volume_24h: number; // 24시간 누적 거래량

  @IsNumber()
  highest_52_week_price: number; // 52주 신고가

  @IsString()
  highest_52_week_date: string; // 52주 신고가 달성일

  @IsNumber()
  lowest_52_week_price: number; // 52주 신저가

  @IsString()
  lowest_52_week_date: string; // 52주 신저가 달성일

  @IsOptional()
  @IsString()
  ask_bid?: 'ASK' | 'BID'; // 매수/매도 구분 (Upbit 명세에는 있으나 필수는 아님)

  @IsOptional()
  @IsNumber()
  acc_ask_volume?: number; // 누적 매도량

  @IsOptional()
  @IsNumber()
  acc_bid_volume?: number; // 누적 매수량

  @IsOptional()
  @IsString()
  market_state?: 'PREVIEW' | 'ACTIVE' | 'DELISTED'; // 거래상태

  @IsOptional()
  @IsBoolean()
  is_trading_suspended?: boolean; // 거래 정지 여부

  @IsOptional()
  @IsString()
  delisting_date?: string; // 거래지원 종료일

  @IsOptional()
  @IsString()
  market_warning?: 'NONE' | 'CAUTION'; // 유의 종목 여부

  @IsNumber()
  timestamp: number; // 타임스탬프

  @IsString()
  stream_type: 'SNAPSHOT' | 'REALTIME'; // 스트림 타입
}
