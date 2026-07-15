import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { Subject } from "rxjs";
import { normalizeUpbit, createOutputStream } from "../src/workers/pipeline";

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe("normalizeUpbit", () => {
  it("maps ticker code to market", () => {
    const out = normalizeUpbit({
      type: "ticker",
      code: "KRW-BTC",
      trade_price: 5,
      signed_change_rate: 0.1,
      acc_trade_price_24h: 9,
    });

    expect(out).toEqual({
      channel: "ticker",
      item: {
        market: "KRW-BTC",
        tradePrice: 5,
        signedChangeRate: 0.1,
        accTradePrice24h: 9,
      },
    });
  });

  it("maps candle.1s type to candle channel", () => {
    const out = normalizeUpbit({
      type: "candle.1s",
      code: "KRW-BTC",
      timestamp: 1,
      opening_price: 1,
      high_price: 2,
      low_price: 0,
      trade_price: 1,
      candle_acc_trade_volume: 3,
    });

    expect(out?.channel).toBe("candle");
  });

  it("uses candle_date_time_utc as the candle timestamp", () => {
    const out = normalizeUpbit({
      type: "candle.1m",
      code: "KRW-BTC",
      candle_date_time_utc: "2026-07-08T01:23:00",
      timestamp: 1_783_476_789_123,
      opening_price: 1,
      high_price: 2,
      low_price: 1,
      trade_price: 2,
      candle_acc_trade_volume: 3,
    });

    expect(out?.item.timestamp).toBe(Date.parse("2026-07-08T01:23:00Z"));
  });

  it("falls back to calendar month start for monthly candle timestamps", () => {
    const out = normalizeUpbit({
      type: "candle.1mo",
      code: "KRW-BTC",
      timestamp: Date.parse("2026-07-21T12:34:56Z"),
      opening_price: 1,
      high_price: 2,
      low_price: 1,
      trade_price: 2,
      candle_acc_trade_volume: 3,
    });

    expect(out?.item.timestamp).toBe(Date.parse("2026-07-01T00:00:00Z"));
  });

  it("uses trade_timestamp as the trade timestamp", () => {
    const out = normalizeUpbit({
      type: "trade",
      code: "KRW-BTC",
      trade_price: 5,
      trade_volume: 0.1,
      ask_bid: "BID",
      timestamp: 1,
      trade_timestamp: 2,
    });

    expect(out?.item.timestamp).toBe(2);
  });

  it("returns null for unknown type", () => {
    expect(normalizeUpbit({ type: "myOrder" })).toBeNull();
  });

  it("returns null for invalid known payloads", () => {
    expect(normalizeUpbit({ type: "ticker", code: "KRW-BTC", trade_price: "5" })).toBeNull();
  });
});

describe("createOutputStream", () => {
  it("consolidates ticker updates per 100ms window keeping latest per market", () => {
    const raw$ = new Subject<any>();
    const got: any[] = [];
    const sub = createOutputStream(raw$).subscribe((response) => got.push(response));

    raw$.next({
      type: "ticker",
      code: "KRW-BTC",
      trade_price: 1,
      signed_change_rate: 0,
      acc_trade_price_24h: 0,
    });
    raw$.next({
      type: "ticker",
      code: "KRW-BTC",
      trade_price: 2,
      signed_change_rate: 0,
      acc_trade_price_24h: 0,
    });
    raw$.next({
      type: "ticker",
      code: "KRW-ETH",
      trade_price: 9,
      signed_change_rate: 0,
      acc_trade_price_24h: 0,
    });

    vi.advanceTimersByTime(120);

    const tick = got.find((response) => response.type === "ticker");
    expect(tick.data).toEqual(
      expect.arrayContaining([
        { market: "KRW-BTC", tradePrice: 2, signedChangeRate: 0, accTradePrice24h: 0 },
        { market: "KRW-ETH", tradePrice: 9, signedChangeRate: 0, accTradePrice24h: 0 },
      ]),
    );
    expect(tick.data).toHaveLength(2);
    sub.unsubscribe();
  });

  it("emits validation errors without emitting invalid channel data", () => {
    const raw$ = new Subject<any>();
    const got: any[] = [];
    const sub = createOutputStream(raw$).subscribe((response) => got.push(response));

    raw$.next({
      type: "ticker",
      code: "KRW-BTC",
      trade_price: "1",
      signed_change_rate: 0,
      acc_trade_price_24h: 0,
    });

    expect(got).toEqual([
      expect.objectContaining({
        type: "validation-error",
        error: expect.objectContaining({
          code: "SCHEMA_MISMATCH",
          source: "websocket",
        }),
      }),
    ]);
    sub.unsubscribe();
  });
});
