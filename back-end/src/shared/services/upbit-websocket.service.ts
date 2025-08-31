import { Injectable, Logger } from '@nestjs/common';
import { WebSocket } from 'ws';
import { ConfigService } from '@nestjs/config';
import { Subject, Observable } from 'rxjs';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class UpbitWebsocketService {
  private readonly logger = new Logger(UpbitWebsocketService.name);
  private ws: WebSocket;
  private isConnected = false;
  private messageSubject = new Subject<any>();
  public messages$: Observable<any> = this.messageSubject.asObservable();
  private readonly websocketUrl: string;
  private activeSubscriptions: Map<string, string[]> = new Map(); // 각 type별 구독 코드 목록

  constructor(private readonly configService: ConfigService) {
    this.websocketUrl = this.configService.get<string>(
      'UPBIT_WEBSOCKET_URL',
      'wss://api.upbit.com/websocket/v1',
    );
    this.connect();
  }

  private connect(): void {
    this.ws = new WebSocket(this.websocketUrl);

    this.ws.onopen = () => {
      this.isConnected = true;
      this.logger.log('Upbit WebSocket 연결 성공');
      this._sendConsolidatedSubscription(); // 연결 성공 시 현재 구독 중인 모든 데이터를 다시 요청
    };

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data.toString());
        this.messageSubject.next(data);
      } catch (error) {
        this.logger.error('Upbit WebSocket 메시지 파싱 오류', error.stack);
      }
    };

    this.ws.onerror = (error) => {
      this.logger.error('Upbit WebSocket 오류 발생', error.message);
      this.isConnected = false;
    };

    this.ws.onclose = (event) => {
      this.isConnected = false;
      this.logger.warn(
        `Upbit WebSocket 연결 종료: 코드 ${event.code}, 이유: ${event.reason}. 5초 후 재연결 시도...`,
      );
      setTimeout(() => this.connect(), 5000);
    };
  }

  private _sendConsolidatedSubscription(): void {
    if (!this.isConnected) {
      this.logger.warn(
        'WebSocket이 연결되지 않아 통합 구독 메시지를 보낼 수 없습니다.',
      );
      return;
    }

    const requestMessage: any[] = [{ ticket: uuidv4() }];

    this.activeSubscriptions.forEach((codes, type) => {
      if (codes.length > 0) {
        requestMessage.push({ type: type, codes: codes });
      }
    });

    if (requestMessage.length > 1) {
      // ticket만 있는 경우는 제외
      requestMessage.push({ format: 'DEFAULT' });
      this.sendMessage(requestMessage);
      this.logger.log(
        `Upbit WebSocket 통합 구독 요청: ${JSON.stringify(requestMessage)}`,
      );
    }
  }

  public sendMessage(message: object): void {
    if (this.ws && this.isConnected) {
      this.ws.send(JSON.stringify(message));
    } else {
      this.logger.warn(
        'Upbit WebSocket이 연결되지 않아 메시지를 보낼 수 없습니다.',
      );
    }
  }

  public subscribeTicker(codes: string[]): void {
    this.activeSubscriptions.set('ticker', codes);
    this._sendConsolidatedSubscription();
  }

  public subscribeOrderbook(codes: string[]): void {
    this.activeSubscriptions.set('orderbook', codes);
    this._sendConsolidatedSubscription();
  }

  public subscribeCandle(codes: string[]): void {
    this.activeSubscriptions.set('candle.1m', codes); // Candle 타입은 'candle.1m'으로 고정
    this._sendConsolidatedSubscription();
  }

  public subscribeTrade(codes: string[]): void {
    this.activeSubscriptions.set('trade', codes);
    this._sendConsolidatedSubscription();
  }

  public unsubscribe(
    type: 'ticker' | 'orderbook' | 'candle.1m' | 'trade',
    codes?: string[],
  ): void {
    if (!this.activeSubscriptions.has(type)) {
      this.logger.warn(`구독 해지할 타입(${type})이 활성화되어 있지 않습니다.`);
      return;
    }

    if (codes && codes.length > 0) {
      // 특정 코드만 해지
      const currentCodes = this.activeSubscriptions.get(type) || [];
      const newCodes = currentCodes.filter((code) => !codes.includes(code));
      this.activeSubscriptions.set(type, newCodes);
    } else {
      // 해당 타입의 모든 코드 해지
      this.activeSubscriptions.set(type, []);
    }
    this._sendConsolidatedSubscription();
    this.logger.log(
      `Upbit WebSocket 구독 해지 요청: 타입 ${type}, 코드: ${codes ? codes.join(', ') : '모든 코드'}`,
    );
  }

  public getIsConnected(): boolean {
    return this.isConnected;
  }
}
