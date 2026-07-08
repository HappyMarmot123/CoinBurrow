import { mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import { createPinia } from "pinia";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import ExchangePage from "../src/features/exchange/ExchangePage.vue";

function readSource(path: string): string {
  return readFileSync(path, "utf8").replace(/\r\n/g, "\n");
}

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

describe("ExchangePage", () => {
  it("renders exchange page layout and core hero controls", () => {
    const wrapper = mount(ExchangePage, {
      global: {
        plugins: [createPinia()],
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
        },
      },
    });

    const exchangeLink = wrapper.find('a[href="/exchange"]');
    const insightsLink = wrapper.find('a[href="/insights"]');
    expect(exchangeLink.exists()).toBe(true);
    expect(insightsLink.exists()).toBe(true);
    expect(wrapper.find('a[href="/news"]').exists()).toBe(false);
  });

  it("defines responsive exchange shell, sidebar, split grid, and chart controls", () => {
    const source = readSource(join(process.cwd(), "src/features/exchange/ExchangePage.vue"));

    expect(source).toContain(".exchange-layout {");
    expect(source).toContain("grid-template-columns: minmax(0, 1fr) clamp(");
    expect(source).toContain(".panel-sidebar {");
    expect(source).toContain("position: sticky;");
    expect(source).toContain(".split-grid {");
    expect(source).toContain("grid-template-columns: repeat(2, minmax(0, 1fr));");
    expect(source).toContain(".chart-controls {");
    expect(source).toContain(".timeframe-tabs button {");
    expect(source).toContain("min-height: 38px;");
    expect(source).toContain("@media (max-width: 960px)");
    expect(source).toContain("order: -1;");
    expect(source).toContain("max-height: min(52dvh, 460px);");
  });
});
