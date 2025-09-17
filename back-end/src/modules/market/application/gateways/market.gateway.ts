import {
  WebSocketGateway,
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketServer,
  SubscribeMessage,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, Inject, forwardRef } from '@nestjs/common';
import { Market } from '../market.dto';
import { MarketNotificationService } from '../../domain/services/market-notification.service';

@WebSocketGateway({ namespace: '/market' })
export class MarketGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(MarketGateway.name);

  constructor(
    @Inject(forwardRef(() => MarketNotificationService))
    private readonly marketNotificationService: MarketNotificationService,
  ) {}

  handleConnection(client: Socket) {
    this.logger.log(`Client connected [market]: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  sendMarketDataToClient(): void {}

  sendNotificationUpdateToAllClients(): void {}
}
