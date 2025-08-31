import { IsString, IsNumber, IsIn, IsOptional } from 'class-validator';

export class TradeDto {
  @IsString()
  type: string; // 데이터 항목

  @IsString()
  code: string; // 페어(거래쌍)의 코드

  @IsString()
  trade_date: string; // 체결 일자(UTC)

  @IsString()
  trade_time: string; // 체결 시각(UTC)

  @IsNumber()
  trade_timestamp: number; // 체결 타임스탬프(ms)

  @IsNumber()
  trade_price: number; // 체결 가격

  @IsNumber()
  trade_volume: number; // 체결량

  @IsNumber()
  ask_bid: 'ASK' | 'BID'; // 매수/매도 구분

  @IsNumber()
  prev_closing_price: number; // 전일 종가

  @IsNumber()
  change_price: number; // 변화액

  @IsString()
  sequential_id: string; // 체결 순번 (unique)

  @IsOptional()
  @IsString()
  stream_type?: 'SNAPSHOT' | 'REALTIME'; // 스트림 타입
}
