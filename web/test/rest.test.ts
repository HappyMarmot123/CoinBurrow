import { describe, it, expect, vi, afterEach } from "vitest";
import { getCoinList, getCandles } from "../src/api/rest";

afterEach(() => vi.restoreAllMocks());

describe("rest client", () => {
  it("getCoinList calls /market/coin-list", async () => {
    const data = [{ market: "KRW-BTC", koreanName: "비트코인", englishName: "Bitcoin" }];
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ success: true, data }) }));

    expect(await getCoinList()).toEqual(data);
    expect(fetch).toHaveBeenCalledWith("/market/coin-list");
  });

  it("getCandles passes market query", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ success: true, data: [] }) }));

    await getCandles("KRW-BTC");

    expect(fetch).toHaveBeenCalledWith("/market/exchange/candle?market=KRW-BTC");
  });

  it("rejects a response without the API envelope", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => [] }));

    await expect(getCoinList()).rejects.toMatchObject({
      normalizedError: {
        code: "SCHEMA_MISMATCH",
        source: "http",
      },
    });
  });
});
