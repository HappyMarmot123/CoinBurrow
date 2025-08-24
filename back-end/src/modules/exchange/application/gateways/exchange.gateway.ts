import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { TickerService } from '../../domain/services/ticker.service';
import { OrderbookService } from '../../domain/services/orderbook.service';
import { CandleService } from '../../domain/services/candle.service';
import { MarketQueryParams } from '../exchange.dto';
import { SubscriptionHandler } from './subscription.handler';

@WebSocketGateway({
  namespace: '/exchange',
  cors: { origin: ['http://localhost:3000'], credentials: true },
})
export class ExchangeGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer() server: Server;
  private readonly logger = new Logger(ExchangeGateway.name);
  private tickerHandler: SubscriptionHandler;
  private orderbookHandler: SubscriptionHandler;
  private candleHandler: SubscriptionHandler;

  constructor(
    private readonly tickerService: TickerService,
    private readonly orderbookService: OrderbookService,
    private readonly candleService: CandleService,
  ) {}

  afterInit(server: Server) {
    this.logger.log('WebSocket Gateway Initialized');
    this.tickerHandler = new SubscriptionHandler(this.server, this.logger, {
      roomPrefix: 'ticker',
      emitEventName: 'tickerUpdate',
      intervalDuration: 1000,
      fetchFunction: this.tickerService.fetchTickers.bind(this.tickerService),
      isMarketSpecific: false,
    });
    this.orderbookHandler = new SubscriptionHandler(this.server, this.logger, {
      roomPrefix: 'orderbook',
      emitEventName: 'orderbookUpdate',
      intervalDuration: 1000,
      fetchFunction: this.orderbookService.fetchOrderbook.bind(
        this.orderbookService,
      ),
      isMarketSpecific: true,
    });
    this.candleHandler = new SubscriptionHandler(this.server, this.logger, {
      roomPrefix: 'candle',
      emitEventName: 'candleUpdate',
      intervalDuration: 1000,
      fetchFunction: this.candleService.fetchCandles.bind(this.candleService),
      isMarketSpecific: true,
    });
  }

  handleConnection(client: Socket, ...args: any[]) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
    this.tickerHandler.checkAndStopIfUnused();
    // 클라이언트가 떠난 후 모든 구독을 중지
    // 각 구독은 해당 클라이언트가 떠난 후 룸이 비었는지 확인 후 중지
    // 따라서 removeClientFromAllRooms 대신 handler의 unsubscribe를 호출해야 함.
    // 하지만 지금은 전체 인터벌을 중지하는 로직만 남겨둠.

    // 모든 인터벌의 활성 상태를 주기적으로 점검하고 필요 시 중지
    this.checkAndStopUnusedIntervals();
  }

  @SubscribeMessage('subscribeTicker')
  async handleSubscribeTicker(client: Socket): Promise<void> {
    await this.tickerHandler.subscribe(client);
  }

  @SubscribeMessage('unsubscribeTicker')
  handleUnsubscribeTicker(client: Socket): void {
    this.tickerHandler.unsubscribe(client);
  }

  @SubscribeMessage('subscribeOrderbook')
  handleSubscribeOrderbook(
    client: Socket,
    market: MarketQueryParams['market'],
  ): void {
    this.orderbookHandler.subscribe(client, market);
  }

  @SubscribeMessage('unsubscribeOrderbook')
  handleUnsubscribeOrderbook(
    client: Socket,
    market: MarketQueryParams['market'],
  ): void {
    this.orderbookHandler.unsubscribe(client, market);
  }

  @SubscribeMessage('subscribeCandle')
  handleSubscribeCandle(
    client: Socket,
    market: MarketQueryParams['market'],
  ): void {
    this.candleHandler.subscribe(client, market);
  }

  @SubscribeMessage('unsubscribeCandle')
  handleUnsubscribeCandle(
    client: Socket,
    market: MarketQueryParams['market'],
  ): void {
    this.candleHandler.unsubscribe(client, market);
  }

  private checkAndStopUnusedIntervals(): void {
    this.tickerHandler.checkAndStopIfUnused();
    this.orderbookHandler.checkAndStopIfUnused();
    this.candleHandler.checkAndStopIfUnused();
  }
}
