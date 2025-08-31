import {
  IsString,
  IsNumber,
  IsArray,
  ValidateNested,
  IsOptional,
} from 'class-validator';
import { Type } from 'class-transformer';

export class OrderbookUnit {
  @IsNumber()
  ask_price: number; // 매도호가

  @IsNumber()
  bid_price: number; // 매수호가

  @IsNumber()
  ask_size: number; // 매도잔량

  @IsNumber()
  bid_size: number; // 매수잔량
}

export class OrderbookDto {
  @IsString()
  type: string; // 데이터 항목

  @IsString()
  code: string; // 종목 코드

  @IsNumber()
  timestamp: number; // 타임스탬프

  @IsNumber()
  total_ask_size: number; // 호가 매도 총 잔량

  @IsNumber()
  total_bid_size: number; // 호가 매수 총 잔량

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderbookUnit)
  orderbook_units: OrderbookUnit[]; // 호가

  @IsOptional()
  @IsString()
  stream_type?: 'SNAPSHOT' | 'REALTIME'; // 스트림 타입

  @IsOptional()
  @IsNumber()
  level?: number; // 모아보기 단위 (KRW 마켓 전용)
}
