import { describe, it, expect, beforeEach, vi } from "vitest";
import { flushPromises, mount } from "@vue/test-utils";
import { setActivePinia, createPinia } from "pinia";

import CoinList from "../src/features/exchange/CoinList.vue";
import { useMarketStore } from "../src/stores/market";
import { useTickerStore } from "../src/stores/ticker";

function jsonResponse(body: unknown) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

beforeEach(() => {
  setActivePinia(createPinia());
  vi.restoreAllMocks();
});

describe("CoinList", () => {
  it("filters by search query", async () => {
    const store = useMarketStore();
    store.setList([
      { market: "KRW-BTC", koreanName: "Bitcoin", englishName: "Bitcoin" },
      { market: "KRW-ETH", koreanName: "Ethereum", englishName: "Ethereum" },
    ]);

    const wrapper = mount(CoinList, { props: { selected: "KRW-BTC" } });
    await wrapper.find("input").setValue("eth");

    expect(wrapper.text()).toContain("Ethereum");
    expect(wrapper.text()).not.toContain("Bitcoin");
  });

  it("loads Bithumb premium when KRW quote is selected", async () => {
    const marketStore = useMarketStore();
    marketStore.setList([
      { market: "KRW-BTC", koreanName: "Bitcoin", englishName: "Bitcoin" },
      { market: "KRW-ETH", koreanName: "Ethereum", englishName: "Ethereum" },
    ]);

    const tickerStore = useTickerStore();
    tickerStore.applyTicker([
      { market: "KRW-BTC", tradePrice: 50_000, signedChangeRate: 0.012, accTradePrice24h: 150_000 },
      { market: "KRW-ETH", tradePrice: 3_000, signedChangeRate: -0.01, accTradePrice24h: 80_000 },
    ]);

    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes("/market/freeapi/bithumb/markets")) {
          return jsonResponse([
            {
              symbol: "BTC/KRW",
              source: "bithumb",
              lastPrice: "51,500",
              changeRate: "2.1",
              volume: "100",
              quoteVolume: "100",
              ts: 1,
            },
          ]);
        }

        return jsonResponse([]);
      }),
    );

    const wrapper = mount(CoinList, { props: { selected: "KRW-BTC", quote: "KRW" } });

    await flushPromises();

    const rows = wrapper.findAll("li");
    expect(rows).toHaveLength(2);
    expect(rows[0].text()).toContain("UPBIT / BITHUMB");
    expect(rows[0].text()).toContain("+3.00%");
    expect(wrapper.find(".coin-main__source").exists()).toBe(true);
  });
});
