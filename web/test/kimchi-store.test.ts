import { describe, it, expect, beforeEach } from "vitest";
import { setActivePinia, createPinia } from "pinia";
import { useBinanceStore } from "../src/stores/binance";
import { useKimchiStore } from "../src/stores/kimchi";
import { useTickerStore } from "../src/stores/ticker";
import { useFxStore } from "../src/stores/fx";

beforeEach(() => setActivePinia(createPinia()));

describe("binance store", () => {
  it("indexes price by symbol", () => {
    const store = useBinanceStore();
    store.applyPrices([{ symbol: "BTCUSDT", price: 65000 }]);
    expect(store.bySymbol["BTCUSDT"]).toBe(65000);
  });
});

describe("kimchi store rows", () => {
  it("computes premium percent from upbit, binance, fx", () => {
    const kimchi = useKimchiStore();
    kimchi.items = [
      {
        upbitMarket: "KRW-BTC",
        binanceSymbol: "BTCUSDT",
        base: "BTC",
        koreanName: "비트코인",
        accTradePrice24h: 100,
      },
    ];

    useTickerStore().applyTicker([
      { market: "KRW-BTC", tradePrice: 138_500_000, signedChangeRate: 0, accTradePrice24h: 100 },
    ]);
    useBinanceStore().applyPrices([{ symbol: "BTCUSDT", price: 100_000 }]);
    useFxStore().krw = 1380;

    const row = kimchi.rows[0];
    // binanceKrw = 100000 * 1380 = 138,000,000 ; premium = 138.5M/138M - 1 = 0.3623...%
    expect(row.binanceKrw).toBe(138_000_000);
    expect(row.premiumPercent).toBeCloseTo(0.36231, 4);
    expect(kimchi.binanceSymbols).toEqual(["BTCUSDT"]);
    expect(kimchi.upbitMarkets).toEqual(["KRW-BTC"]);
  });

  it("leaves premium null when fx missing", () => {
    const kimchi = useKimchiStore();
    kimchi.items = [
      { upbitMarket: "KRW-BTC", binanceSymbol: "BTCUSDT", base: "BTC", koreanName: "비트코인", accTradePrice24h: 100 },
    ];
    useTickerStore().applyTicker([
      { market: "KRW-BTC", tradePrice: 138_500_000, signedChangeRate: 0, accTradePrice24h: 100 },
    ]);
    useBinanceStore().applyPrices([{ symbol: "BTCUSDT", price: 100_000 }]);
    useFxStore().krw = null;

    expect(kimchi.rows[0].premiumPercent).toBeNull();
  });
});
