import { describe, it, expect, beforeEach } from "vitest";
import { setActivePinia, createPinia } from "pinia";
import { mount } from "@vue/test-utils";
import CoinList from "../src/features/exchange/CoinList.vue";
import { useMarketStore } from "../src/stores/market";

beforeEach(() => setActivePinia(createPinia()));

describe("CoinList", () => {
  it("filters by search query", async () => {
    const store = useMarketStore();
    store.setList([
      { market: "KRW-BTC", koreanName: "비트코인", englishName: "Bitcoin" },
      { market: "KRW-ETH", koreanName: "이더리움", englishName: "Ethereum" },
    ]);

    const wrapper = mount(CoinList, { props: { selected: "KRW-BTC" } });
    await wrapper.find("input").setValue("이더");

    expect(wrapper.text()).toContain("이더리움");
    expect(wrapper.text()).not.toContain("비트코인");
  });
});
