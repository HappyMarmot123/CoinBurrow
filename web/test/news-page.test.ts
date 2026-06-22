import { createPinia } from "pinia";
import { flushPromises, mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";

import NewsPage from "../src/features/news/NewsPage.vue";

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

describe("NewsPage", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/market/news/sources")) {
        return jsonResponse({
          provider: "cryptocurrency.cv",
          sources: ["CoinDesk", "TokenPost"],
          categories: ["bitcoin"],
          languages: ["en", "ko"],
          fetchedAt: 123,
          cacheTtlMs: 300000,
          stale: false,
        });
      }

      return jsonResponse({
        articles: [
          {
            id: "news-1",
            title: "Bitcoin ETF headline",
            url: "https://example.com",
            source: "CoinDesk",
            publishedAt: Date.UTC(2026, 5, 22, 1, 2),
            summary: "Market moved after ETF news.",
            language: "en",
            assets: ["BTC"],
            categories: ["bitcoin"],
            sentiment: "positive",
            provider: "cryptocurrency.cv",
          },
        ],
        fetchedAt: Date.UTC(2026, 5, 22, 1, 2),
        cacheTtlMs: 300000,
        provider: "cryptocurrency.cv",
        stale: false,
      });
    }));
  });

  it("renders the news page controls and cards", async () => {
    const wrapper = mount(NewsPage, {
      global: {
        plugins: [createPinia()],
        stubs: {
          "router-link": { template: "<a><slot /></a>" },
        },
      },
    });

    await flushPromises();

    expect(wrapper.find("h1").text()).toBe("크립토 뉴스");
    expect(wrapper.text()).toContain("Bitcoin ETF headline");
    expect(wrapper.text()).toContain("XRP");
    expect(wrapper.text()).toContain("CoinDesk");
    expect(wrapper.text()).toContain("긍정");
    expect(wrapper.find('input[type="search"]').exists()).toBe(true);
    expect(wrapper.find('a[href="https://example.com"]').attributes("target")).toBe("_blank");
    expect(wrapper.find('a[href="https://example.com"]').attributes("rel")).toBe("noopener noreferrer");
  });
});
