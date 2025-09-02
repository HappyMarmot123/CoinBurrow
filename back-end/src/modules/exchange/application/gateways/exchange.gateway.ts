import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
} from '@nestjs/websockets';
import { Logger, OnModuleInit, Inject } from '@nestjs/common';
import { Server } from 'socket.io';
import { UpbitWebsocketService } from '../../../../shared/services/upbit-websocket.service';
import { TickerDto } from '../ticker.dto';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { throttleTime, groupBy, mergeMap } from 'rxjs/operators';
import { TARGET_COINS } from '../../../../shared/constants/market.constants';
import { Subject } from 'rxjs';
import { OrderbookHandler } from './orderbook.handler';
import { CandleHandler } from './candle.handler';
import { TradeHandler } from './trade.handler';
import { CandleService } from '../../domain/services/candle.service';
import { MarketQueryParams } from '../exchange.dto';

@WebSocketGateway({
  namespace: '/exchange',
  cors: '*',
})
export class ExchangeGateway implements OnModuleInit {
  @WebSocketServer()
  server: Server;
  private readonly logger = new Logger(ExchangeGateway.name);
  private tickerDataMap: Map<string, TickerDto> = new Map();
  private tickerFlushSubject = new Subject<void>();
  private messageHandlerChain: OrderbookHandler; // 책임 연쇄의 시작 핸들러

  constructor(
    private readonly upbitWebsocketService: UpbitWebsocketService,
    private readonly candleService: CandleService,
  ) {
    this.messageHandlerChain = new OrderbookHandler();
    const candleHandler = new CandleHandler();
    const tradeHandler = new TradeHandler();

    this.messageHandlerChain.setNext(candleHandler).setNext(tradeHandler);
  }

  onModuleInit() {
    this.upbitWebsocketService.messages$
      .pipe(
        groupBy((message: any) => message.type),
        mergeMap((group) => {
          if (group.key === 'ticker') {
            return group.pipe(
              throttleTime(100),
              mergeMap(async (message: any) => {
                try {
                  const tickerDto = plainToInstance(TickerDto, message);
                  const errors = await validate(tickerDto);

                  if (errors.length > 0) {
                    this.logger.error(
                      `Ticker 데이터 유효성 검사 실패: ${JSON.stringify(errors)}`,
                    );
                    return null;
                  }

                  this.tickerDataMap.set(tickerDto.code, tickerDto);
                  this.tickerFlushSubject.next();
                } catch (error) {
                  this.logger.error(
                    'Ticker 데이터 처리 중 오류 발생',
                    error.stack,
                  );
                } finally {
                  return null;
                }
              }),
            );
          } else {
            return group.pipe(throttleTime(1000));
          }
        }),
      )
      .subscribe(async (message) => {
        if (message === null || message.type === 'ticker') return;
        // 책임 연쇄 패턴을 사용하여 메시지 처리
        await this.messageHandlerChain.handle(message, this.server);
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
        this.tickerDataMap.clear();
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
  async subscribeCandle(client: any, codes: string[]): Promise<void> {
    if (!codes || codes.length === 0) {
      this.logger.warn(
        '클라이언트가 구독할 Candle 코드를 제공하지 않았습니다.',
      );
      return;
    }

    for (const market of codes) {
      const historicalCandles = await this.candleService.fetchCandles(
        market as MarketQueryParams['market'],
      );
      client.emit('init_200_candles', { init200Candles: historicalCandles });
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
    this.upbitWebsocketService.unsubscribe('candle.1s', codes);
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
