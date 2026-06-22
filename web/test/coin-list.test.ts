import { describe, it, expect, beforeEach, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { setActivePinia, createPinia } from "pinia";

import CoinList from "../src/features/exchange/CoinList.vue";
import { useMarketStore } from "../src/stores/market";

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
});
