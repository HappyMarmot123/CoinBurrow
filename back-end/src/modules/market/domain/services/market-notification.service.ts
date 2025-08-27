import {
  Injectable,
  Logger,
  OnModuleInit,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { Market } from '../../application/market.dto';
import { MarketGateway } from '../../application/gateways/market.gateway';
import {
  MarketDataObservable,
  MarketDataObserver,
} from './market-data.observable';

// TODO: DB 없어서 알림 내역을 메모리상에 최대 5개까지 저장
const MAX_NOTIFICATION_HISTORY = 5;

@Injectable()
export class MarketNotificationService
  implements OnModuleInit, MarketDataObserver
{
  private readonly logger = new Logger(MarketNotificationService.name);
  private notificationHistory: Market[][] = [];

  constructor(
    private readonly marketDataObservable: MarketDataObservable,
    @Inject(forwardRef(() => MarketGateway))
    private readonly marketGateway: MarketGateway,
  ) {}

  onModuleInit() {
    this.marketDataObservable.addObserver(this);
    this.logger.log(
      'MarketNotificationService subscribed to MarketDataObservable',
    );
  }

  update(): void {}

  getNotificationHistory(): Market[][] {
    return this.notificationHistory;
  }

  private addNotificationToHistory(): void {
    if (this.notificationHistory.length >= MAX_NOTIFICATION_HISTORY) {
      this.notificationHistory.shift(); // 가장 오래된 알림 제거
    }
    this.notificationHistory.push();
  }
}
