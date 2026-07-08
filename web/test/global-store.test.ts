import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { setActivePinia, createPinia } from "pinia";
import { useGlobalStore } from "../src/stores/global";

beforeEach(() => setActivePinia(createPinia()));
afterEach(() => vi.restoreAllMocks());

describe("global store", () => {
  it("loads global snapshot", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({
      ok: true,
      json: async () => ({
        provider: "coingecko",
        totalMarketCapUsd: 2_410_000_000_000,
        totalVolumeUsd: 98_300_000_000,
        marketCapChangePct24h: -1.23,
        btcDominance: 54.2,
        ethDominance: 17.1,
        activeCryptocurrencies: 13567,
        markets: 1089,
        fetchedAt: 1,
        cacheTtlMs: 60000,
        stale: false,
      }),
    })) as unknown as typeof fetch);

    const store = useGlobalStore();
    await store.load();

    expect(store.current?.totalMarketCapUsd).toBe(2_410_000_000_000);
    expect(store.current?.btcDominance).toBe(54.2);
    expect(store.error).toBe("");
  });

  it("sets error message on failure", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("network down"); }) as unknown as typeof fetch);

    const store = useGlobalStore();
    await store.load();

    expect(store.current).toBeNull();
    expect(store.error).toBe("network down");
  });
});
