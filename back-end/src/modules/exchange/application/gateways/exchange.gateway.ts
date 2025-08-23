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
import { MarketQueryParams } from '../exchange.dto';

@WebSocketGateway({ namespace: '/exchange', cors: true })
export class ExchangeGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer() server: Server;
  private readonly logger = new Logger(ExchangeGateway.name);
  private tickerInterval: NodeJS.Timeout | null;
  private orderbookIntervals: Map<string, NodeJS.Timeout> = new Map();

  constructor(
    private readonly tickerService: TickerService,
    private readonly orderbookService: OrderbookService,
  ) {}

  afterInit(server: Server) {
    this.logger.log('WebSocket Gateway Initialized');
  }

  handleConnection(client: Socket, ...args: any[]) {
    this.logger.log(`Client connected: ${client.id}`);
    if (this.server.engine.clientsCount === 1) {
      this.startTickerInterval();
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
    // Stop the ticker interval if no clients are connected
    if (this.server.engine.clientsCount === 0) {
      this.stopTickerInterval();
    }
    // Stop any orderbook intervals for rooms that are now empty
    this.orderbookIntervals.forEach((interval, market) => {
      const room = this.server.sockets.adapter.rooms.get(market);
      if (!room || room.size === 0) {
        clearInterval(interval);
        this.orderbookIntervals.delete(market);
        this.logger.log(`Stopped orderbook interval for market: ${market}`);
      }
    });
  }

  @SubscribeMessage('subscribeOrderbook')
  handleSubscribeOrderbook(client: Socket, market: string): void {
    if (!market) return;
    this.logger.log(
      `Client ${client.id} subscribed to orderbook for ${market}`,
    );
    client.join(market);

    // Start a new interval if one doesn't exist for this market
    if (!this.orderbookIntervals.has(market)) {
      this.logger.log(`Starting orderbook interval for market: ${market}`);
      const interval = setInterval(async () => {
        try {
          const orderbook = await this.orderbookService.fetchOrderbook([
            { market: market as MarketQueryParams['market'] },
          ]);
          this.server.to(market).emit('orderbookUpdate', orderbook);
        } catch (error) {
          this.logger.error(
            `Failed to fetch orderbook for ${market}`,
            error.stack,
          );
          this.server.to(market).emit('error', {
            message: `Failed to fetch orderbook for ${market}`,
            error: error.message,
          });
        }
      }, 1000);
      this.orderbookIntervals.set(market, interval);
    }
  }

  @SubscribeMessage('unsubscribeOrderbook')
  handleUnsubscribeOrderbook(client: Socket, market: string): void {
    if (!market) return;
    this.logger.log(
      `Client ${client.id} unsubscribed from orderbook for ${market}`,
    );
    client.leave(market);

    // If the room is empty, stop the interval
    const room = this.server.sockets.adapter.rooms.get(market);
    if (!room || room.size === 0) {
      const interval = this.orderbookIntervals.get(market);
      if (interval) {
        clearInterval(interval);
        this.orderbookIntervals.delete(market);
        this.logger.log(`Stopped orderbook interval for market: ${market}`);
      }
    }
  }

  private startTickerInterval(): void {
    if (this.tickerInterval) return;
    this.logger.log('Starting ticker interval...');
    this.tickerInterval = setInterval(async () => {
      try {
        const tickers = await this.tickerService.fetchTickers();
        this.server.emit('tickerUpdate', tickers);
      } catch (error) {
        this.logger.error('Failed to fetch tickers for websocket', error.stack);
        this.server.emit('error', {
          message: 'Failed to fetch tickers',
          error: error.message,
        });
      }
    }, 1000);
  }

  private stopTickerInterval(): void {
    if (this.tickerInterval) {
      clearInterval(this.tickerInterval);
      this.tickerInterval = null;
      this.logger.log('Stopped ticker interval as no clients are connected.');
    }
  }
}
