import { describe, it, expect, beforeEach } from "vitest";
import { mount } from "@vue/test-utils";
import { setActivePinia, createPinia } from "pinia";

import OrderbookPanel from "../src/features/exchange/OrderbookPanel.vue";
import { useOrderbookStore } from "../src/stores/orderbook";

beforeEach(() => {
  setActivePinia(createPinia());
});

describe("OrderbookPanel", () => {
  it("uses the live current price for the center display when provided", async () => {
    const store = useOrderbookStore();
    store.applyOrderbook({
      market: "KRW-BTC",
      timestamp: 1,
      units: [
        {
          askPrice: 105,
          bidPrice: 95,
          askSize: 1,
          bidSize: 1,
        },
      ],
    });

    const wrapper = mount(OrderbookPanel, { props: { currentPrice: 101 } });
    const center = wrapper.find(".orderbook-mid");

    expect(center.text()).toContain("101");
    expect(center.text()).not.toContain("100");

    await center.trigger("click");

    expect(wrapper.emitted("select-price")?.[0]).toEqual([101]);
  });
});
