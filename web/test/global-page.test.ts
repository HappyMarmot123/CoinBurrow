import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { mount } from "@vue/test-utils";
import { setActivePinia, createPinia } from "pinia";
import { createRouter, createWebHistory } from "vue-router";
import GlobalPage from "../src/features/global/GlobalPage.vue";

const router = createRouter({ history: createWebHistory(), routes: [{ path: "/", component: { template: "<div/>" } }] });

beforeEach(() => setActivePinia(createPinia()));
afterEach(() => vi.restoreAllMocks());

describe("GlobalPage", () => {
  it("renders total market cap when data loads", async () => {
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

    const wrapper = mount(GlobalPage, { global: { plugins: [router] } });
    await router.isReady();
    await new Promise((r) => setTimeout(r, 0));
    await wrapper.vm.$nextTick();

    expect(wrapper.text()).toContain("총 시가총액");
    expect(wrapper.text()).toContain("$2.4T");
    expect(wrapper.text()).toContain("BTC 도미넌스");
  });

  it("shows degraded message", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({
      ok: true,
      json: async () => ({
        provider: "coingecko",
        totalMarketCapUsd: null,
        totalVolumeUsd: null,
        marketCapChangePct24h: null,
        btcDominance: null,
        ethDominance: null,
        activeCryptocurrencies: null,
        markets: null,
        fetchedAt: 1,
        cacheTtlMs: 60000,
        stale: false,
        degraded: true,
        degradedReason: "UPSTREAM_ERROR",
      }),
    })) as unknown as typeof fetch);

    const wrapper = mount(GlobalPage, { global: { plugins: [router] } });
    await router.isReady();
    await new Promise((r) => setTimeout(r, 0));
    await wrapper.vm.$nextTick();

    expect(wrapper.text()).toContain("일시적으로 가져올 수 없습니다");
  });
});
