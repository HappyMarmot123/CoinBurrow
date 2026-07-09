import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import { setActivePinia, createPinia } from "pinia";
import { createRouter, createWebHistory } from "vue-router";
import InsightsPage from "../src/features/insights/InsightsPage.vue";
import SentimentView from "../src/features/sentiment/SentimentView.vue";
import KimchiView from "../src/features/kimchi/KimchiView.vue";

function makeRouter() {
  return createRouter({
    history: createWebHistory(),
    routes: [
      { path: "/", component: { template: "<div/>" } },
      { path: "/insights", component: InsightsPage },
      { path: "/global", redirect: "/insights" },
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

describe("InsightsPage one-page hub", () => {
  it("stacks all three sections (global content + sentiment + kimchi) on one page", async () => {
    const router = makeRouter();
    router.push("/insights");
    await router.isReady();

    // SentimentView(차트)·KimchiView(WS 워커)는 jsdom에서 무거우므로 스텁.
    const wrapper = mount(InsightsPage, {
      global: {
        plugins: [router],
        stubs: { SentimentView: true, KimchiView: true },
      },
    });
    await flushPromises();

    expect(wrapper.text()).toContain("시장 동향");
    expect(wrapper.text()).toContain("시총");
    expect(wrapper.text()).toContain("심리");
    expect(wrapper.text()).toContain("김치프리미엄");
    expect(wrapper.text()).toContain("총 시가총액"); // GlobalView (not stubbed)
    expect(wrapper.find('[aria-labelledby="insights-global-title"]').exists()).toBe(true);
    expect(wrapper.find('[aria-labelledby="insights-sentiment-title"]').exists()).toBe(true);
    expect(wrapper.find('[aria-labelledby="insights-kimchi-title"]').exists()).toBe(true);
    expect(wrapper.findComponent(SentimentView).exists()).toBe(true);
    expect(wrapper.findComponent(KimchiView).exists()).toBe(true);
  });

  it("redirects legacy /global to /insights", async () => {
    const router = makeRouter();
    router.push("/global");
    await router.isReady();
    expect(router.currentRoute.value.fullPath).toBe("/insights");
  });
});
