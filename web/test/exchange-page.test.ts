import { mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import { createPinia, type Pinia } from "pinia";

import ExchangePage from "../src/features/exchange/ExchangePage.vue";
import type { SimulatorState } from "../src/api/simulator.js";
import { useSimulatorStore } from "../src/stores/simulator.js";
import CandleChart from "../src/features/exchange/CandleChartV2.vue";

vi.mock("../src/composables/useMarketMeta.js", () => ({
  useMarketMeta: () => ({
    availableQuotes: [],
    statusError: "",
    selectedMarketSummary: null,
    selectedMarketStatus: null,
    marketStatusCautions: [],
    marketState: "active",
    marketRestriction: "없음",
    usdKrwRate: null,
    loadAvailableQuotes: vi.fn(async () => undefined),
    loadMeta: vi.fn(async () => undefined),
    loadMarketStatus: vi.fn(async () => undefined),
  }),
}));

vi.mock("../src/composables/useExchangeData.js", () => ({
  useExchangeData: () => ({
    exchangeError: "",
    selectedMarketLabel: "Bitcoin",
    liveTicker: null,
    selectedOrderbook: null,
    selectedMarketSpread: null,
    topByVolume: [],
    topGainers: [],
    topLosers: [],
    resolveMarketName: vi.fn((market: string) => market),
    loadMarketsByQuote: vi.fn(async () => "KRW-BTC"),
    loadMarket: vi.fn(async () => undefined),
    unsubscribeMarket: vi.fn(),
  }),
}));

function mountPage(pinia: Pinia = createPinia()) {
  return mount(ExchangePage, {
    global: {
      plugins: [pinia],
      stubs: {
        "router-link": {
          props: ["to"],
          template: '<a :href="to"><slot /></a>',
        },
        ExchangeHero: true,
        CandleChart: true,
        OrderbookPanel: true,
        TradeList: true,
        MarketMovementPanel: true,
        CoinList: true,
        ExchangeSimulatorPanel: true,
      },
    },
  });
}

const simulatorState: SimulatorState = {
  account: {
    startingCash: 100_000_000,
    cashBalance: 5_000_000,
    investedValue: 95_000_000,
    totalAsset: 100_000_000,
    totalProfit: 0,
    returnRate: 0,
  },
  positions: [{
    symbol: "BTC",
    quantity: 1,
    avgPrice: 95_000_000,
    currentPrice: 100_000_000,
    marketValue: 100_000_000,
    profit: 5_000_000,
    returnRate: 5.26,
  }],
  purchasedSymbols: ["BTC"],
  quotes: [
    { symbol: "BTC", price: 100_000_000, changeRate: 0.01 },
    { symbol: "ETH", price: 5_000_000, changeRate: -0.01 },
  ],
  asOf: 1_700_000_000_000,
};

describe("ExchangePage", () => {
  it("renders exchange page layout and core hero controls", () => {
    const wrapper = mountPage();

    const exchangeLink = wrapper.find('a[href="/exchange"]');
    const insightsLink = wrapper.find('a[href="/insights"]');
    expect(exchangeLink.exists()).toBe(true);
    expect(insightsLink.exists()).toBe(true);
    expect(wrapper.find('a[href="/news"]').exists()).toBe(false);
    expect(wrapper.find("exchange-simulator-panel-stub").exists()).toBe(true);

    const workspace = wrapper.get(".trade-workspace");
    expect(workspace.find("orderbook-panel-stub").exists()).toBe(true);
    expect(workspace.find("exchange-simulator-panel-stub").exists()).toBe(true);
  });

  it("passes the selected position average price to the chart and clears it with the position", async () => {
    const pinia = createPinia();
    const simulatorStore = useSimulatorStore(pinia);
    simulatorStore.state = simulatorState;
    const wrapper = mountPage(pinia);

    const chart = wrapper.getComponent(CandleChart);
    expect(chart.props("buyPrice")).toBe(95_000_000);

    wrapper.getComponent({ name: "CoinList" }).vm.$emit("select", "KRW-ETH");
    await wrapper.vm.$nextTick();
    expect(chart.props("market")).toBe("KRW-ETH");
    expect(chart.props("buyPrice")).toBeUndefined();

    simulatorStore.state = {
      ...simulatorState,
      positions: [{
        symbol: "ETH",
        quantity: 2,
        avgPrice: 4_800_000,
        currentPrice: 5_000_000,
        marketValue: 10_000_000,
        profit: 400_000,
        returnRate: 4.17,
      }],
      purchasedSymbols: ["BTC", "ETH"],
    };
    await wrapper.vm.$nextTick();
    expect(chart.props("buyPrice")).toBe(4_800_000);

    simulatorStore.state = { ...simulatorState, positions: [] };
    await wrapper.vm.$nextTick();

    expect(chart.props("buyPrice")).toBeUndefined();
  });
});
