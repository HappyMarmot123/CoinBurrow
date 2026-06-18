import { describe, it, expect, vi, afterEach } from "vitest";
import { getCoinList, getCandles } from "../src/api/rest";

afterEach(() => vi.restoreAllMocks());

describe("rest client", () => {
  it("getCoinList calls /market/coin-list", async () => {
    const data = [{ market: "KRW-BTC", koreanName: "비트코인", englishName: "Bitcoin" }];
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => data }));

    expect(await getCoinList()).toEqual(data);
    expect(fetch).toHaveBeenCalledWith("/market/coin-list");
  });

  it("getCandles passes market query", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => [] }));

    await getCandles("KRW-BTC");

    expect(fetch).toHaveBeenCalledWith("/market/exchange/candle?market=KRW-BTC");
  });
});
