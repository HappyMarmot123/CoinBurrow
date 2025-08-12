import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketServer,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

@WebSocketGateway({ namespace: '/auth' })
export class AuthGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(AuthGateway.name);
  private clients: Map<string, Socket> = new Map();

  handleConnection(client: Socket) {
    const sessionToken = client.handshake.query.sessionToken as string;
    if (!sessionToken) {
      client.disconnect();
      this.logger.warn('Client connected without sessionToken. Disconnecting.');
      return;
    }
    this.clients.set(sessionToken, client);
    this.logger.log(
      `Client connected: ${client.id} with session ${sessionToken}`,
    );
  }

  handleDisconnect(client: Socket) {
    const sessionToken = Array.from(this.clients.entries()).find(
      ([key, value]) => value.id === client.id,
    )?.[0];

    if (sessionToken) {
      this.clients.delete(sessionToken);
      this.logger.log(
        `Client disconnected: ${client.id} with session ${sessionToken}`,
      );
    } else {
      this.logger.log(`Client disconnected: ${client.id}`);
    }
  }

  sendTokenToClient(
    sessionToken: string,
    tokens: { accessToken: string; refreshToken: string },
  ) {
    const client = this.clients.get(sessionToken);
    if (client) {
      client.emit('qr-login-success', tokens);
      this.logger.log(`Sent tokens to client with session: ${sessionToken}`);
      client.disconnect();
    } else {
      this.logger.warn(`Could not find client for session: ${sessionToken}`);
    }
  }
}
