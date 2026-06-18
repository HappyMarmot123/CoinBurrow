import { describe, it, expect } from "vitest";
import { buildUpbitSubscription, type Channel } from "../src/workers/protocol";

describe("buildUpbitSubscription", () => {
  it("builds ticket + typed entries + format", () => {
    const subs: Record<Channel, Set<string>> = {
      ticker: new Set(["KRW-BTC"]),
      orderbook: new Set(["KRW-BTC"]),
      candle: new Set(),
      trade: new Set(),
    };

    const msg = buildUpbitSubscription(subs) as any[];

    expect(msg[0]).toHaveProperty("ticket");
    expect(msg).toEqual(
      expect.arrayContaining([
        { type: "ticker", codes: ["KRW-BTC"] },
        { type: "orderbook", codes: ["KRW-BTC"] },
      ]),
    );
    expect(msg).not.toEqual(expect.arrayContaining([{ type: "candle.1s", codes: [] }]));
    expect(msg[msg.length - 1]).toEqual({ format: "DEFAULT" });
  });
});
