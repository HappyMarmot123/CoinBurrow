import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { MarketQueryParams } from '../exchange.dto';

interface SubscriptionConfig {
  roomPrefix: string;
  emitEventName: string;
  intervalDuration: number; // in ms
  fetchFunction: (market?: MarketQueryParams['market']) => Promise<any>;
  isMarketSpecific?: boolean; // true for orderbook/candle, false for global ticker
}

export class SubscriptionHandler {
  private readonly logger: Logger;
  private readonly server: Server;
  private readonly config: SubscriptionConfig;
  private intervals: Map<string, NodeJS.Timeout> = new Map();
  private debounceTimers: Map<string, NodeJS.Timeout> = new Map();

  constructor(server: Server, logger: Logger, config: SubscriptionConfig) {
    this.server = server;
    this.logger = logger;
    this.config = config;
  }

  private getRoomName(market?: MarketQueryParams['market']): string {
    return this.config.isMarketSpecific && market
      ? `${this.config.roomPrefix}-${market}`
      : this.config.roomPrefix;
  }

  private debounceAction(key: string, func: () => void, delay: number): void {
    if (this.debounceTimers.has(key)) {
      clearTimeout(this.debounceTimers.get(key));
    }
    const timer = setTimeout(() => {
      func();
      this.debounceTimers.delete(key);
    }, delay);
    this.debounceTimers.set(key, timer);
  }

  public async subscribe(
    client: Socket,
    market?: MarketQueryParams['market'],
  ): Promise<void> {
    const roomName = this.getRoomName(market);

    if (client.rooms.has(roomName)) {
      this.logger.log(
        `Client ${client.id} is already subscribed to ${roomName}`,
      );
      return;
    }

    client.join(roomName);

    const debounceKey = this.config.isMarketSpecific
      ? `${this.config.roomPrefix}-interval-${market}`
      : `${this.config.roomPrefix}-interval-global`;
    this.debounceAction(
      debounceKey,
      () => {
        if (!this.intervals.has(debounceKey)) {
          const interval = setInterval(async () => {
            try {
              const data = await this.config.fetchFunction(market);
              if (data) {
                const dataToSend = Array.isArray(data) ? data : [data];
                this.server
                  .to(roomName)
                  .emit(this.config.emitEventName, dataToSend);
              }
            } catch (error) {
              this.logger.error(
                `Failed to fetch ${this.config.roomPrefix} for ${market || 'all markets'}`,
                error.stack,
              );
              this.server.to(roomName).emit('error', {
                message: `Failed to fetch ${this.config.roomPrefix} for ${market || 'all markets'}!`,
                error: error.message,
              });
            }
          }, this.config.intervalDuration);
          this.intervals.set(debounceKey, interval);
        } else {
          this.logger.log(
            `${this.config.roomPrefix} interval for ${market || 'all markets'} is already running. Client ${client.id} joined existing room.`,
          );
        }
      },
      500,
    );
  }

  public unsubscribe(
    client: Socket,
    market?: MarketQueryParams['market'],
  ): void {
    const roomName = this.getRoomName(market);

    if (!client.rooms.has(roomName)) {
      this.logger.log(`Client ${client.id} is not subscribed to ${roomName}`);
      return;
    }

    this.logger.log(
      `Client ${client.id} unsubscribed from ${this.config.roomPrefix} for ${market || 'all markets'}`,
    );
    client.leave(roomName);

    this.checkAndStopIfUnused(market);
  }

  public checkAndStopIfUnused(market?: MarketQueryParams['market']): void {
    const debounceKey = this.config.isMarketSpecific
      ? `${this.config.roomPrefix}-interval-${market}`
      : `${this.config.roomPrefix}-interval-global`;
    const roomName = this.getRoomName(market);
    const room = this.server.sockets?.adapter?.rooms?.get(roomName);

    if (!room || room.size === 0) {
      const interval = this.intervals.get(debounceKey);
      if (interval) {
        clearInterval(interval);
        this.intervals.delete(debounceKey);
        this.logger.log(
          `Stopped ${this.config.roomPrefix} interval for ${market || 'all markets'} due to no subscribers.`,
        );
      }
    }
  }

  public stopAllIntervals(): void {
    this.intervals.forEach((interval, key) => {
      clearInterval(interval);
      this.logger.log(`Stopped ${this.config.roomPrefix} interval for ${key}`);
    });
    this.intervals.clear();
    this.debounceTimers.forEach((timer) => clearTimeout(timer));
    this.debounceTimers.clear();
  }
}
