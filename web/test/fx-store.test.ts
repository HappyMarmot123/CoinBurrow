import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { setActivePinia, createPinia } from "pinia";
import { useFxStore } from "../src/stores/fx";

beforeEach(() => setActivePinia(createPinia()));
afterEach(() => vi.restoreAllMocks());

describe("fx store", () => {
  it("loads krw rate", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({
      ok: true,
      json: async () => ({ base: "USD", krw: 1380.5, source: "exchangerate-api", fetchedAt: 1, cacheTtlMs: 1, stale: false }),
    })) as unknown as typeof fetch);

    const store = useFxStore();
    await store.load();

    expect(store.krw).toBe(1380.5);
    expect(store.degraded).toBe(false);
  });

  it("marks degraded when payload is degraded", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({
      ok: true,
      json: async () => ({ base: "USD", krw: null, source: null, fetchedAt: 1, cacheTtlMs: 1, stale: false, degraded: true }),
    })) as unknown as typeof fetch);

    const store = useFxStore();
    await store.load();

    expect(store.krw).toBeNull();
    expect(store.degraded).toBe(true);
  });
});
