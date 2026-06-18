import { describe, it, expect, beforeEach } from "vitest";
import { setActivePinia, createPinia } from "pinia";
import { useTickerStore } from "../src/stores/ticker";
import { useCandleStore } from "../src/stores/candle";
import { useTradeStore } from "../src/stores/trade";

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

  it("trade store keeps newest first, caps at 50", () => {
    const store = useTradeStore();
    for (let i = 0; i < 60; i++) {
      store.applyTrade({ market: "KRW-BTC", price: i, volume: 1, side: "BID", timestamp: i });
    }

    expect(store.recent).toHaveLength(50);
    expect(store.recent[0].price).toBe(59);
  });
});
