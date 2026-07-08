import { describe, it, expect, beforeEach } from "vitest";
import { setActivePinia, createPinia } from "pinia";
import { useTickerStore } from "../src/stores/ticker";
import { useCandleStore } from "../src/stores/candle";
import { useTradeStore } from "../src/stores/trade";
import { useValidationHealthStore } from "../src/stores/validation-health";

beforeEach(() => setActivePinia(createPinia()));

describe("stores", () => {
  it("ticker store indexes by market", () => {
    const store = useTickerStore();
    store.applyTicker([{ market: "KRW-BTC", tradePrice: 1, signedChangeRate: 0, accTradePrice24h: 0 }]);

    expect(store.byMarket["KRW-BTC"].tradePrice).toBe(1);
  });

  it("candle store updates same timestamp, pushes new", () => {
    const store = useCandleStore();
    store.setInitial([{ market: "KRW-BTC", timestamp: 1, open: 1, high: 1, low: 1, close: 1, volume: 1 }]);
    store.applyCandle({ market: "KRW-BTC", timestamp: 1, open: 1, high: 2, low: 1, close: 2, volume: 5 });

    expect(store.candles).toHaveLength(1);
    expect(store.candles[0].close).toBe(2);

    store.applyCandle({ market: "KRW-BTC", timestamp: 2, open: 2, high: 2, low: 2, close: 2, volume: 1 });
    expect(store.candles).toHaveLength(2);
  });

  it("candle store projects trade ticks into the active candle bucket", () => {
    const store = useCandleStore();
    const bucketStart = Date.parse("2026-07-08T01:23:00Z");
    store.setInitial([
      {
        market: "KRW-BTC",
        timestamp: bucketStart,
        open: 100,
        high: 105,
        low: 95,
        close: 101,
        volume: 1,
      },
    ]);

    store.applyTradeTick(
      { market: "KRW-BTC", price: 110, volume: 0.1, side: "BID", timestamp: bucketStart + 30_000 },
      "1m",
    );

    expect(store.candles).toHaveLength(1);
    expect(store.candles[0]).toMatchObject({
      timestamp: bucketStart,
      open: 100,
      high: 110,
      low: 95,
      close: 110,
      volume: 1,
    });

    store.applyTradeTick(
      { market: "KRW-BTC", price: 90, volume: 0.1, side: "ASK", timestamp: bucketStart + 45_000 },
      "1m",
    );

    expect(store.candles[0]).toMatchObject({
      high: 110,
      low: 90,
      close: 90,
    });
  });

  it("candle store creates provisional candles from the first trade in a new bucket", () => {
    const store = useCandleStore();
    const bucketStart = Date.parse("2026-07-08T01:23:00Z");
    store.setInitial([
      { market: "KRW-BTC", timestamp: bucketStart, open: 100, high: 105, low: 95, close: 101, volume: 1 },
    ]);

    store.applyTradeTick(
      { market: "KRW-BTC", price: 120, volume: 0.1, side: "BID", timestamp: bucketStart + 60_001 },
      "1m",
    );

    expect(store.candles).toHaveLength(2);
    expect(store.candles[1]).toEqual({
      market: "KRW-BTC",
      timestamp: bucketStart + 60_000,
      open: 120,
      high: 120,
      low: 120,
      close: 120,
      volume: 0,
    });
  });

  it("candle store ignores older trade ticks after a newer projection in the same bucket", () => {
    const store = useCandleStore();
    const bucketStart = Date.parse("2026-07-08T01:23:00Z");
    store.setInitial([
      { market: "KRW-BTC", timestamp: bucketStart, open: 100, high: 100, low: 100, close: 100, volume: 1 },
    ]);

    store.applyTradeTick(
      { market: "KRW-BTC", price: 120, volume: 0.1, side: "BID", timestamp: bucketStart + 40_000 },
      "1m",
    );
    store.applyTradeTick(
      { market: "KRW-BTC", price: 90, volume: 0.1, side: "ASK", timestamp: bucketStart + 20_000 },
      "1m",
    );

    expect(store.candles[0]).toMatchObject({
      high: 120,
      low: 100,
      close: 120,
    });
  });

  it("candle store projects monthly trades to the UTC month start", () => {
    const store = useCandleStore();
    const monthStart = Date.parse("2026-07-01T00:00:00Z");

    store.applyTradeTick(
      { market: "KRW-BTC", price: 120, volume: 0.1, side: "BID", timestamp: Date.parse("2026-07-21T12:34:56Z") },
      "1mo",
    );

    expect(store.candles[0]).toEqual({
      market: "KRW-BTC",
      timestamp: monthStart,
      open: 120,
      high: 120,
      low: 120,
      close: 120,
      volume: 0,
    });
  });

  it("candle store trims projected candles to the requested max count", () => {
    const store = useCandleStore();
    const bucketStart = Date.parse("2026-07-08T01:23:00Z");
    store.setInitial([
      { market: "KRW-BTC", timestamp: bucketStart, open: 100, high: 100, low: 100, close: 100, volume: 1 },
      { market: "KRW-BTC", timestamp: bucketStart + 60_000, open: 101, high: 101, low: 101, close: 101, volume: 1 },
    ]);

    store.applyTradeTick(
      { market: "KRW-BTC", price: 102, volume: 0.1, side: "BID", timestamp: bucketStart + 120_001 },
      "1m",
      2,
    );

    expect(store.candles).toHaveLength(2);
    expect(store.candles.map((candle) => candle.timestamp)).toEqual([
      bucketStart + 60_000,
      bucketStart + 120_000,
    ]);
  });

  it("trade store keeps newest first, caps at 50", () => {
    const store = useTradeStore();
    for (let i = 0; i < 60; i++) {
      store.applyTrade({ market: "KRW-BTC", price: i, volume: 1, side: "BID", timestamp: i });
    }

    expect(store.recent).toHaveLength(50);
    expect(store.recent[0].price).toBe(59);
  });

  it("validation health tracks mismatch, retry, fallback, and stale state", () => {
    const store = useValidationHealthStore();

    store.recordConnectionStatus(true);
    store.recordConnectionStatus(false);
    store.recordError({
      source: "websocket",
      code: "SCHEMA_MISMATCH",
      message: "bad payload",
      retryable: true,
      path: "trade_price",
    });
    store.recordFallback("ticker", "schema mismatch");

    expect(store.stale).toBe(true);
    expect(store.mismatchCount).toBe(1);
    expect(store.retryCount).toBe(2);
    expect(store.fallbackCount).toBe(1);

    store.clearEvents();

    expect(store.stale).toBe(false);
    expect(store.recentEvents).toHaveLength(0);
  });
});
