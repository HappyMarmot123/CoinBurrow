import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import { setActivePinia, createPinia } from "pinia";
import { createRouter, createWebHistory } from "vue-router";
import InsightsPage from "../src/features/insights/InsightsPage.vue";
import GlobalView from "../src/features/global/GlobalView.vue";
import SentimentView from "../src/features/sentiment/SentimentView.vue";
import KimchiView from "../src/features/kimchi/KimchiView.vue";

function makeRouter() {
  return createRouter({
    history: createWebHistory(),
    routes: [
      {
        path: "/insights",
        component: InsightsPage,
        children: [
          { path: "", redirect: { name: "insights-global" } },
          { path: "global", name: "insights-global", component: GlobalView },
          { path: "sentiment", name: "insights-sentiment", component: SentimentView },
          { path: "kimchi", name: "insights-kimchi", component: KimchiView },
        ],
      },
      { path: "/global", redirect: "/insights/global" },
      { path: "/", component: { template: "<div/>" } },
    ],
  });
}

beforeEach(() => {
  setActivePinia(createPinia());
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
});
afterEach(() => vi.restoreAllMocks());

describe("InsightsPage hub", () => {
  it("shows the hub header, three tabs, and the global view by default", async () => {
    const router = makeRouter();
    router.push("/insights/global");
    await router.isReady();

    const wrapper = mount(InsightsPage, {
      global: {
        plugins: [router],
        stubs: { SentimentView: true, KimchiView: true },
      },
    });
    await flushPromises();

    expect(wrapper.text()).toContain("시장 동향");
    const tabEls = wrapper.findAll('[role="tab"]');
    expect(tabEls).toHaveLength(3);
    expect(tabEls[0].text()).toContain("글로벌 시총");
    expect(wrapper.text()).toContain("총 시가총액");
  });

  it("redirects legacy /global to /insights/global", async () => {
    const router = makeRouter();
    router.push("/global");
    await router.isReady();
    expect(router.currentRoute.value.fullPath).toBe("/insights/global");
  });
});
