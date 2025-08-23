import {
  WebSocketGateway,
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketServer,
  SubscribeMessage,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import * as WebSocket from 'ws';
import { v4 as uuidv4 } from 'uuid';
import { TARGET_COINS } from '@/shared/constants/market.constants';

@WebSocketGateway({ namespace: '/market' })
export class MarketGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(MarketGateway.name);
  private upbitWs: WebSocket;

  constructor() {
    this.connectToUpbit();
  }

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  private connectToUpbit() {
    this.upbitWs = new WebSocket('wss://api.upbit.com/websocket/v1');

    this.upbitWs.on('open', () => {
      this.logger.log('Connected to Upbit WebSocket');
      const targetMarkets = TARGET_COINS.map((coin) => `KRW-${coin}`);

      const subscribeMessage = [
        { ticket: uuidv4() },
        { type: 'ticker', codes: targetMarkets },
      ];
      this.upbitWs.send(JSON.stringify(subscribeMessage));
    });

    this.upbitWs.on('message', (data: WebSocket.Data) => {
      const message = JSON.parse(data.toString());
      this.server.emit('ticker', message);
    });

    this.upbitWs.on('close', () => {
      this.logger.log('Disconnected from Upbit WebSocket. Reconnecting...');
      setTimeout(() => this.connectToUpbit(), 1000);
    });

    this.upbitWs.on('error', (error) => {
      this.logger.error('Upbit WebSocket error:', error);
      this.upbitWs.close();
    });
  }

  @SubscribeMessage('ping')
  handlePing(client: Socket): void {
    client.emit('pong');
  }
}
