import { createPinia, setActivePinia } from "pinia";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useNewsStore } from "../src/stores/news";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("news store", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.restoreAllMocks();
  });

  it("loads news articles and tracks stale state", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => jsonResponse({
      articles: [
        {
          id: "news-1",
          title: "Bitcoin news",
          url: "https://example.com",
          source: "CoinDesk",
          publishedAt: 1,
          assets: ["BTC"],
          categories: ["bitcoin"],
          sentiment: "unknown",
          provider: "cryptocurrency.cv",
        },
      ],
      fetchedAt: 123,
      cacheTtlMs: 300000,
      provider: "cryptocurrency.cv",
      stale: true,
    })));

    const store = useNewsStore();
    await store.loadNews();

    expect(store.articles).toHaveLength(1);
    expect(store.stale).toBe(true);
    expect(store.lastFetchedAt).toBe(123);
    expect(store.error).toBeNull();
  });

  it("keeps existing articles when refresh fails", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse({
        articles: [
          {
            id: "news-1",
            title: "Bitcoin news",
            url: "https://example.com",
            source: "CoinDesk",
            publishedAt: 1,
            assets: ["BTC"],
            categories: ["bitcoin"],
            sentiment: "unknown",
            provider: "cryptocurrency.cv",
          },
        ],
        fetchedAt: 123,
        cacheTtlMs: 300000,
        provider: "cryptocurrency.cv",
        stale: false,
      }))
      .mockResolvedValueOnce(jsonResponse({ error: "failed" }, 502));

    vi.stubGlobal("fetch", fetchMock);

    const store = useNewsStore();
    await store.loadNews();
    await store.refreshNews();

    expect(store.articles).toHaveLength(1);
    expect(store.error).toContain("failed to load");
  });

  it("sends filter query parameters when the query changes", async () => {
    const fetchMock = vi.fn(async (_input: RequestInfo | URL) => jsonResponse({
      articles: [],
      fetchedAt: 123,
      cacheTtlMs: 300000,
      provider: "cryptocurrency.cv",
      stale: false,
    }));

    vi.stubGlobal("fetch", fetchMock);

    const store = useNewsStore();
    await store.setQuery({ q: "ethereum", asset: "ETH", language: "ko" });

    const url = String(fetchMock.mock.calls[0]?.[0]);
    expect(url).toContain("/market/news/articles");
    expect(url).toContain("q=ethereum");
    expect(url).toContain("asset=ETH");
    expect(url).toContain("language=ko");
  });
});
