import { describe, expect, it } from "vitest";

import { toSimulatorSymbol } from "../src/features/simulator/simulatorMarket.js";

describe("simulator market mapping", () => {
  it.each([
    ["KRW-BTC", "BTC"],
    ["KRW-ETH", "ETH"],
  ] as const)("maps %s to the supported simulator symbol", (market, symbol) => {
    expect(toSimulatorSymbol(market)).toBe(symbol);
  });

  it.each(["KRW-XRP", "USDT-BTC", "BTC"])("rejects unsupported market %s", (market) => {
    expect(toSimulatorSymbol(market)).toBeNull();
  });
});
