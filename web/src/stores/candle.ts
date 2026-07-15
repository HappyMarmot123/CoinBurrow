import { defineStore } from "pinia";
import type { CandleTimeframe } from "../api/rest.js";
import type { CandleView } from "./types.js";
import type { TradeView } from "./types.js";

const CANDLE_INTERVALS_MS: Partial<Record<CandleTimeframe, number>> = {
  "1s": 1_000,
  "1m": 60_000,
  "3m": 180_000,
  "5m": 300_000,
  "10m": 600_000,
  "15m": 900_000,
  "30m": 1_800_000,
  "60m": 3_600_000,
  "240m": 14_400_000,
  "1h": 3_600_000,
  "4h": 14_400_000,
};

function normalizeTradeBucket(timestamp: number, timeframe: CandleTimeframe): number | null {
  if (timeframe === "1d") return startOfUtcDay(timestamp);
  if (timeframe === "1w") return startOfUtcWeek(timestamp);
  if (timeframe === "1M" || timeframe === "1mo") return startOfUtcMonth(timestamp);
  if (timeframe === "1y") return startOfUtcYear(timestamp);

  const interval = CANDLE_INTERVALS_MS[timeframe];
  if (typeof interval !== "number" || !Number.isFinite(interval) || interval <= 0) {
    return null;
  }

  return Math.floor(timestamp / interval) * interval;
}

function startOfUtcDay(timestamp: number): number {
  const date = new Date(timestamp);
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

function startOfUtcWeek(timestamp: number): number {
  const dayStart = startOfUtcDay(timestamp);
  const day = new Date(dayStart).getUTCDay();
  const daysSinceMonday = (day + 6) % 7;
  return dayStart - daysSinceMonday * 86_400_000;
}

function startOfUtcMonth(timestamp: number): number {
  const date = new Date(timestamp);
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1);
}

function startOfUtcYear(timestamp: number): number {
  const date = new Date(timestamp);
  return Date.UTC(date.getUTCFullYear(), 0, 1);
}

function projectionKey(market: string, timeframe: CandleTimeframe, timestamp: number): string {
  return `${market}|${timeframe}|${timestamp}`;
}

export const useCandleStore = defineStore("candle", {
  state: () => ({
    candles: [] as CandleView[],
    projectedTradeTimestamps: {} as Record<string, number>,
  }),
  actions: {
    setInitial(list: CandleView[]) {
      this.candles = [...list].sort((a, b) => a.timestamp - b.timestamp);
      this.projectedTradeTimestamps = {};
    },
    applyCandle(candle: CandleView) {
      if (this.candles.length === 0) {
        this.candles.push(candle);
        return;
      }

      const sameTimestampIndex = this.candles.findIndex((item) => item.timestamp === candle.timestamp);
      if (sameTimestampIndex >= 0) {
        this.candles.splice(sameTimestampIndex, 1, candle);
        return;
      }

      let insertAt = this.candles.length;
      while (insertAt > 0 && this.candles[insertAt - 1].timestamp > candle.timestamp) {
        insertAt--;
      }

      if (insertAt === this.candles.length) {
        this.candles.push(candle);
      } else if (insertAt === 0) {
        this.candles.unshift(candle);
      } else {
        this.candles.splice(insertAt, 0, candle);
      }
    },
    applyTradeTick(trade: TradeView, timeframe: CandleTimeframe, maxCount = 200) {
      const timestamp = normalizeTradeBucket(trade.timestamp, timeframe);
      if (timestamp === null) {
        return;
      }

      const last = this.candles[this.candles.length - 1];
      if (last && last.market !== trade.market) {
        return;
      }

      const key = projectionKey(trade.market, timeframe, timestamp);
      const projectedAt = this.projectedTradeTimestamps[key];
      if (projectedAt !== undefined && trade.timestamp <= projectedAt) {
        return;
      }

      if (last && last.timestamp === timestamp) {
        this.candles.splice(this.candles.length - 1, 1, {
          ...last,
          high: Math.max(last.high, trade.price),
          low: Math.min(last.low, trade.price),
          close: trade.price,
        });
        this.projectedTradeTimestamps[key] = trade.timestamp;
        return;
      }

      if (last && timestamp < last.timestamp) {
        return;
      }

      this.applyCandle({
        market: trade.market,
        timestamp,
        open: trade.price,
        high: trade.price,
        low: trade.price,
        close: trade.price,
        volume: 0,
      });
      this.projectedTradeTimestamps[key] = trade.timestamp;

      if (this.candles.length > maxCount) {
        this.candles = this.candles.slice(-Math.max(maxCount, 1));
      }
    },
    applyTradeTicks(trades: TradeView[], timeframe: CandleTimeframe, maxCount = 200) {
      [...trades]
        .sort((a, b) => a.timestamp - b.timestamp)
        .forEach((trade) => this.applyTradeTick(trade, timeframe, maxCount));
    },
  },
});
