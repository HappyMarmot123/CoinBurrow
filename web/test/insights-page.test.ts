import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import { setActivePinia, createPinia } from "pinia";
import { createRouter, createWebHistory } from "vue-router";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import InsightsPage from "../src/features/insights/InsightsPage.vue";
import SentimentView from "../src/features/sentiment/SentimentView.vue";
import KimchiView from "../src/features/kimchi/KimchiView.vue";

function readSource(path: string): string {
  return readFileSync(path, "utf8").replace(/\r\n/g, "\n");
}

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
    expect(wrapper.text()).toContain("총 시가총액"); // GlobalView (not stubbed)
    expect(wrapper.findComponent(SentimentView).exists()).toBe(true);
    expect(wrapper.findComponent(KimchiView).exists()).toBe(true);
    expect(wrapper.find(".insights-shell").exists()).toBe(true);
    expect(wrapper.find(".insights-head").exists()).toBe(true);
    expect(wrapper.find(".insights-stack").exists()).toBe(true);
    expect(wrapper.find(".global-view").exists()).toBe(true);
  });

  it("redirects legacy /global to /insights", async () => {
    const router = makeRouter();
    router.push("/global");
    await router.isReady();
    expect(router.currentRoute.value.fullPath).toBe("/insights");
  });

  it("defines responsive shell spacing for the one-page insights stack", () => {
    const source = readSource(join(process.cwd(), "src/features/insights/InsightsPage.vue"));

    expect(source).toContain(".insights-shell {");
    expect(source).toContain(".insights-stack {");
    expect(source).toContain("@media (max-width: 640px)");
    expect(source).toContain("gap: clamp(12px, 4vw, 16px);");
    expect(source).toContain("padding: 10px 0 18px;");
  });
});
