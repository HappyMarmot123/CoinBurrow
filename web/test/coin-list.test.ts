import { describe, it, expect, beforeEach, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { setActivePinia, createPinia } from "pinia";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import CoinList from "../src/features/exchange/CoinList.vue";
import { useMarketStore } from "../src/stores/market";

function readSource(path: string): string {
  return readFileSync(path, "utf8").replace(/\r\n/g, "\n");
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

  it("keeps mobile row areas explicit for name, price, and change", () => {
    const store = useMarketStore();
    store.setList([
      { market: "KRW-BTC", koreanName: "Bitcoin", englishName: "Bitcoin" },
    ]);

    const wrapper = mount(CoinList, { props: { selected: "KRW-BTC" } });
    const source = readSource(join(process.cwd(), "src/features/exchange/CoinList.vue"));

    expect(wrapper.find(".coin-main").exists()).toBe(true);
    expect(wrapper.find(".coin-price").exists()).toBe(true);
    expect(wrapper.find(".coin-change").exists()).toBe(true);
    expect(source).toContain("grid-template-areas:");
    expect(source).toContain('"main price change"');
    expect(source).toContain('"main change"');
    expect(source).toContain('"price change"');
    expect(source).toContain("grid-area: main;");
    expect(source).toContain("grid-area: price;");
    expect(source).toContain("grid-area: change;");
  });
});
