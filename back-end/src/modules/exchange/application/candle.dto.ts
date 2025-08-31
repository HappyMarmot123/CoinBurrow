import { IsString, IsNumber, IsOptional } from 'class-validator';

export class CandleDto {
  @IsString()
  type: string; // 데이터 항목

  @IsString()
  code: string; // 마켓명

  @IsString()
  candle_date_time_utc: string; // 캔들 기준 시각(UTC)

  @IsString()
  candle_date_time_kst: string; // 캔들 기준 시각(KST)

  @IsNumber()
  opening_price: number; // 시가

  @IsNumber()
  high_price: number; // 고가

  @IsNumber()
  low_price: number; // 저가

  @IsNumber()
  trade_price: number; // 종가

  @IsNumber()
  timestamp: number; // 해당 캔들의 타임스탬프

  @IsNumber()
  candle_acc_trade_price: number; // 누적 거래 금액

  @IsNumber()
  candle_acc_trade_volume: number; // 누적 거래량

  @IsNumber()
  @IsOptional()
  unit?: number; // 분 단위

  @IsOptional()
  @IsString()
  stream_type?: 'SNAPSHOT' | 'REALTIME'; // 스트림 타입
}
