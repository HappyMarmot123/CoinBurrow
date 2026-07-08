import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { Subject } from "rxjs";
import { normalizeBinance, createBinanceOutputStream } from "../src/workers/binancePipeline";

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe("normalizeBinance", () => {
  it("maps miniTicker to symbol/price", () => {
    const out = normalizeBinance({ stream: "btcusdt@miniTicker", data: { s: "BTCUSDT", c: "65000.1" } });
    expect(out).toEqual({ symbol: "BTCUSDT", price: 65000.1 });
  });

  it("returns null for invalid payload", () => {
    expect(normalizeBinance({ stream: "x", data: { s: "BTCUSDT" } })).toBeNull();
  });
});

describe("createBinanceOutputStream", () => {
  it("buffers per 100ms keeping latest per symbol", () => {
    const raw$ = new Subject<unknown>();
    const got: any[] = [];
    const sub = createBinanceOutputStream(raw$).subscribe((r) => got.push(r));

    raw$.next({ stream: "btcusdt@miniTicker", data: { s: "BTCUSDT", c: "1" } });
    raw$.next({ stream: "btcusdt@miniTicker", data: { s: "BTCUSDT", c: "2" } });
    raw$.next({ stream: "ethusdt@miniTicker", data: { s: "ETHUSDT", c: "9" } });

    vi.advanceTimersByTime(120);

    const tick = got.find((r) => r.type === "binance-ticker");
    expect(tick.data).toEqual(
      expect.arrayContaining([
        { symbol: "BTCUSDT", price: 2 },
        { symbol: "ETHUSDT", price: 9 },
      ]),
    );
    expect(tick.data).toHaveLength(2);
    sub.unsubscribe();
  });
});
