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
});
