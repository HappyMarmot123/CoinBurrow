import { describe, it, expect, vi, afterEach } from "vitest";
import {
  getCoinList,
  getCandles,
  getExchangeRates,
  getAvailableQuotes,
  getMarketStatus,
  getMarketSummaries,
  getMarketOverview,
  getOrderbookSnapshots,
  getOrderbookSnapshot,
  getTickersByMarkets,
  getTradeSnapshot,
  getFx,
  getKimchiUniverse,
} from "../src/api/rest";

afterEach(() => vi.restoreAllMocks());

describe("rest client", () => {
  it("getCoinList calls /market/coin-list", async () => {
    const data = [{ market: "KRW-BTC", koreanName: "비트코인", englishName: "Bitcoin" }];
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => data }));

    expect(await getCoinList()).toEqual(data);
    expect(fetch).toHaveBeenCalledWith("/market/coin-list?isDetails=false");
  });

  it("getCoinList accepts quote query", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => [] }));

    await getCoinList({ quote: "BTC" });

    expect(fetch).toHaveBeenCalledWith("/market/coin-list?quote=BTC&isDetails=false");
  });

  it("getAvailableQuotes calls quote summary endpoint", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => [] }));

    await getAvailableQuotes();

    expect(fetch).toHaveBeenCalledWith("/market/exchange/quotes");
  });

  it("getMarketOverview calls aggregate overview endpoint", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => [] }));

    await getMarketOverview(["KRW-BTC", "KRW-ETH"]);

    expect(fetch).toHaveBeenCalledWith(
      "/market/exchange/market-overview?markets=KRW-BTC%2CKRW-ETH",
    );
  });

  it("getCandles passes market query", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => [] }));

    await getCandles("KRW-BTC");

    expect(fetch).toHaveBeenCalledWith("/market/exchange/candle?market=KRW-BTC");
  });

  it("getCandles includes timeframe/count", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => [] }));

    await getCandles("KRW-BTC", { timeframe: "5m", count: 50 });

    expect(fetch).toHaveBeenCalledWith(
      "/market/exchange/candle?market=KRW-BTC&timeframe=5m&count=50",
    );
  });

  it("does not issue fallback requests when the proxy returns an error", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 502 }));

    await expect(getCandles("KRW-BTC")).rejects.toThrow(
      "failed to load /market/exchange/candle?market=KRW-BTC; status 502",
    );
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch).toHaveBeenCalledWith("/market/exchange/candle?market=KRW-BTC");
  });

  it("getMarketStatus accepts market filter", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => [] }));

    await getMarketStatus(["KRW-BTC"]);

    expect(fetch).toHaveBeenCalledWith("/market/exchange/market-status?markets=KRW-BTC");
  });

  it("getExchangeRates hits exchange rates endpoint", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => [] }));

    await getExchangeRates();

    expect(fetch).toHaveBeenCalledWith("/market/exchange/exchange-rates");
  });

  it("getMarketSummaries loads expanded markets", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => [] }));

    await getMarketSummaries({ quote: "KRW" });

    expect(fetch).toHaveBeenCalledWith("/market/exchange/markets?quote=KRW&isDetails=true");
  });

  it("getTickersByMarkets requests multi-markets", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => [] }));

    await getTickersByMarkets(["KRW-BTC", "KRW-ETH"]);

    expect(fetch).toHaveBeenCalledWith(
      "/market/exchange/tickers?markets=KRW-BTC%2CKRW-ETH",
    );
  });

  it("getOrderbookSnapshots supports multi-market query", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => [] }));

    await getOrderbookSnapshots(["KRW-BTC", "KRW-ETH"], { level: 5 });

    expect(fetch).toHaveBeenCalledWith("/market/exchange/orderbook?markets=KRW-BTC%2CKRW-ETH&level=5");
  });

  it("getOrderbookSnapshot keeps backward compatibility", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => [] }));

    await getOrderbookSnapshot("KRW-BTC");

    expect(fetch).toHaveBeenCalledWith("/market/exchange/orderbook?market=KRW-BTC");
  });

  it("getTradeSnapshot supports daysAgo", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => [] }));

    await getTradeSnapshot("KRW-BTC", { count: 10, daysAgo: 3 });

    expect(fetch).toHaveBeenCalledWith(
      "/market/exchange/trade-ticks?market=KRW-BTC&count=10&daysAgo=3",
    );
  });

  it("getFx calls /market/fx", async () => {
    const data = { base: "USD", krw: 1380.5, source: "exchangerate-api", fetchedAt: 1, cacheTtlMs: 1, stale: false };
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => data }));

    const fx = await getFx();

    expect(fetch).toHaveBeenCalledWith("/market/fx");
    expect(fx.krw).toBe(1380.5);
  });

  it("getKimchiUniverse calls /market/kimchi/universe", async () => {
    const data = {
      items: [{ upbitMarket: "KRW-BTC", binanceSymbol: "BTCUSDT", base: "BTC", koreanName: "비트코인", accTradePrice24h: 100 }],
      fetchedAt: 1, cacheTtlMs: 1, stale: false,
    };
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => data }));

    const view = await getKimchiUniverse();

    expect(fetch).toHaveBeenCalledWith("/market/kimchi/universe");
    expect(view.items[0].binanceSymbol).toBe("BTCUSDT");
  });
});
