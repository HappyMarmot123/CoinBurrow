import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
} from '@nestjs/websockets';
import { Logger, OnModuleInit } from '@nestjs/common';
import { Server } from 'socket.io';
import { UpbitWebsocketService } from '../../../../shared/services/upbit-websocket.service';
import { TickerDto } from '../ticker.dto';
import { OrderbookDto } from '../orderbook.dto';
import { CandleDto } from '../candle.dto';
import { TradeDto } from '../trade.dto';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { throttleTime, groupBy, mergeMap } from 'rxjs/operators';
import { TARGET_COINS } from '../../../../shared/constants/market.constants';
import { Subject } from 'rxjs';

@WebSocketGateway({
  namespace: '/exchange',
  cors: '*',
})
export class ExchangeGateway implements OnModuleInit {
  @WebSocketServer()
  server: Server;
  private readonly logger = new Logger(ExchangeGateway.name);
  private tickerDataMap: Map<string, TickerDto> = new Map(); // 각 마켓별 최신 Ticker 데이터를 저장
  private tickerFlushSubject = new Subject<void>(); // Ticker 데이터를 주기적으로 플러시하기 위한 Subject

  constructor(private readonly upbitWebsocketService: UpbitWebsocketService) {}

  onModuleInit() {
    // Ticker 데이터만 따로 처리하여 주기적으로 통합 전송
    this.upbitWebsocketService.messages$
      .pipe(
        groupBy((message: any) => message.type), // 메시지 타입별로 그룹화
        mergeMap((group) => {
          if (group.key === 'ticker') {
            return group.pipe(
              // Ticker 스트림은 별도의 플러싱 로직으로 보냄
              throttleTime(100), // 각 Ticker 데이터 업데이트는 100ms 간격으로 스로틀링
              mergeMap(async (message: any) => {
                try {
                  const tickerDto = plainToInstance(TickerDto, message);
                  const errors = await validate(tickerDto);

                  if (errors.length > 0) {
                    this.logger.error(
                      `Ticker 데이터 유효성 검사 실패: ${JSON.stringify(errors)}`,
                    );
                    return null; // 유효성 검사 실패 시 null 반환
                  } else {
                    this.tickerDataMap.set(tickerDto.code, tickerDto); // 최신 Ticker 데이터 업데이트
                    this.tickerFlushSubject.next(); // 플러시 트리거
                    return null; // 실제 emit은 tickerFlushSubject에서 처리
                  }
                } catch (error) {
                  this.logger.error(
                    'Ticker 데이터 처리 중 오류 발생',
                    error.stack,
                  );
                  return null;
                }
              }),
            );
          } else {
            // 다른 타입의 메시지는 기존대로 throttleTime 적용 후 처리
            return group.pipe(throttleTime(1000));
          }
        }),
      )
      .subscribe(async (message) => {
        // Ticker 메시지는 tickerFlushSubject에서 처리되므로 여기서는 무시
        if (message === null || message.type === 'ticker') return;

        // 기존 orderbook, candle, trade 처리 로직
        if (message.type === 'orderbook') {
          try {
            const orderbookDto = plainToInstance(OrderbookDto, message);
            const errors = await validate(orderbookDto);

            if (errors.length > 0) {
              this.logger.error(
                `Orderbook 데이터 유효성 검사 실패: ${JSON.stringify(errors)}`,
              );
            } else {
              this.logger.debug(
                `[Upbit WebSocket] Orderbook 데이터 수신 및 전송: ${orderbookDto.code}`,
              );
              this.server.emit('orderbook', orderbookDto);
            }
          } catch (error) {
            this.logger.error(
              'Orderbook 데이터 처리 중 오류 발생',
              error.stack,
            );
          }
        } else if (message.type && message.type.startsWith('candle.')) {
          try {
            const candleDto = plainToInstance(CandleDto, message);
            const errors = await validate(candleDto);

            if (errors.length > 0) {
              this.logger.error(
                `Candle 데이터 유효성 검사 실패: ${JSON.stringify(errors)}`,
              );
            } else {
              this.logger.debug(
                `[Upbit WebSocket] Candle 데이터 수신 및 전송: ${candleDto.code}`,
              );
              this.server.emit('candle', [candleDto]);
            }
          } catch (error) {
            this.logger.error('Candle 데이터 처리 중 오류 발생', error.stack);
          }
        } else if (message.type === 'trade') {
          try {
            const tradeDto = plainToInstance(TradeDto, message);
            const errors = await validate(tradeDto);

            if (errors.length > 0) {
              this.logger.error(
                `Trade 데이터 유효성 검사 실패: ${JSON.stringify(errors)}`,
              );
            } else {
              this.logger.debug(
                `[Upbit WebSocket] Trade 데이터 수신 및 전송: ${tradeDto.code}`,
              );
              this.server.emit('trade', tradeDto);
            }
          } catch (error) {
            this.logger.error('Trade 데이터 처리 중 오류 발생', error.stack);
          }
        }
      });

    // Ticker 데이터를 주기적으로 통합하여 클라이언트에 전송
    this.tickerFlushSubject.pipe(throttleTime(1000)).subscribe(() => {
      if (this.tickerDataMap.size > 0) {
        const codesArray = Array.from(this.tickerDataMap.keys());
        const consolidatedTicker = Array.from(this.tickerDataMap.values());
        this.server.emit('ticker', consolidatedTicker);
        this.logger.debug(
          `[Upbit WebSocket] 통합 Ticker 데이터 전송: ${JSON.stringify(codesArray)}`,
        );
        this.tickerDataMap.clear(); // 전송 후 맵 비우기
      }
    });
  }

  @SubscribeMessage('subscribe_ticker')
  subscribeTicker(client: any): void {
    const tickerCodes = Array.from(TARGET_COINS);
    this.upbitWebsocketService.subscribeTicker(tickerCodes);
  }

  @SubscribeMessage('unsubscribe_ticker')
  unsubscribeTicker(client: any): void {
    const tickerCodes = Array.from(TARGET_COINS);
    this.upbitWebsocketService.unsubscribe('ticker', tickerCodes);
    this.logger.log(
      `Ticker 구독 해지 요청: ${tickerCodes ? tickerCodes.join(', ') : '모든 코드'}`,
    );
  }

  @SubscribeMessage('subscribe_orderbook')
  subscribeOrderbook(client: any, codes: string[]): void {
    if (!codes || codes.length === 0) {
      this.logger.warn(
        '클라이언트가 구독할 Orderbook 코드를 제공하지 않았습니다.',
      );
      return;
    }
    this.upbitWebsocketService.subscribeOrderbook(codes);
    this.logger.log(`Orderbook 구독 요청: ${codes.join(', ')}`);
  }

  @SubscribeMessage('subscribe_candle')
  subscribeCandle(client: any, codes: string[]): void {
    if (!codes || codes.length === 0) {
      this.logger.warn(
        '클라이언트가 구독할 Candle 코드를 제공하지 않았습니다.',
      );
      return;
    }
    this.upbitWebsocketService.subscribeCandle(codes);
    this.logger.log(`Candle 구독 요청: ${codes.join(', ')}, 단위: 1분봉`);
  }

  @SubscribeMessage('subscribe_trade')
  subscribeTrade(client: any, codes: string[]): void {
    if (!codes || codes.length === 0) {
      this.logger.warn('클라이언트가 구독할 Trade 코드를 제공하지 않았습니다.');
      return;
    }
    this.upbitWebsocketService.subscribeTrade(codes);
    this.logger.log(`Trade 구독 요청: ${codes.join(', ')}`);
  }

  @SubscribeMessage('unsubscribe_orderbook')
  unsubscribeOrderbook(client: any, codes: string[]): void {
    this.upbitWebsocketService.unsubscribe('orderbook', codes);
    this.logger.log(
      `Orderbook 구독 해지 요청: ${codes ? codes.join(', ') : '모든 코드'}`,
    );
  }

  @SubscribeMessage('unsubscribe_candle')
  unsubscribeCandle(client: any, codes: string[]): void {
    this.upbitWebsocketService.unsubscribe('candle.1m', codes);
    this.logger.log(
      `Candle 구독 해지 요청: ${codes ? codes.join(', ') : '모든 코드'}`,
    );
  }

  @SubscribeMessage('unsubscribe_trade')
  unsubscribeTrade(client: any, codes: string[]): void {
    this.upbitWebsocketService.unsubscribe('trade', codes);
    this.logger.log(
      `Trade 구독 해지 요청: ${codes ? codes.join(', ') : '모든 코드'}`,
    );
  }
}
