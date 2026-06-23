import { describe, it, expect, beforeEach } from "vitest";
import { setActivePinia, createPinia } from "pinia";
import { useBinanceStore } from "../src/stores/binance";

beforeEach(() => setActivePinia(createPinia()));

describe("binance store", () => {
  it("indexes price by symbol", () => {
    const store = useBinanceStore();
    store.applyPrices([{ symbol: "BTCUSDT", price: 65000 }]);
    expect(store.bySymbol["BTCUSDT"]).toBe(65000);
  });
});
