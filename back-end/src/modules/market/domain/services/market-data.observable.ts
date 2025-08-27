import { Market } from '../../application/market.dto';
import { Injectable } from '@nestjs/common';

// Define the observer interface
export interface MarketDataObserver {
  update(marketData: Market[]): void;
}

@Injectable()
export class MarketDataObservable {
  private observers: MarketDataObserver[] = [];
  private currentMarketData: Market[] = [];

  constructor() {}

  addObserver(observer: MarketDataObserver): void {
    this.observers.push(observer);
  }

  removeObserver(observer: MarketDataObserver): void {
    this.observers = this.observers.filter((obs) => obs !== observer);
  }

  private notifyObservers(): void {
    for (const observer of this.observers) {
      observer.update(this.currentMarketData);
    }
  }
}
