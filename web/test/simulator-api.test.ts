import { afterEach, describe, expect, it, vi } from "vitest";

import {
  executeSimulatorOrder,
  getSimulatorState,
  SimulatorApiError,
} from "../src/api/simulator.js";

const state = {
  account: {
    startingCash: 100_000_000,
    cashBalance: 100_000_000,
    investedValue: 0,
    totalAsset: 100_000_000,
    totalProfit: 0,
    returnRate: 0,
  },
  positions: [],
  purchasedSymbols: [],
  quotes: [
    { symbol: "BTC", price: 100_000_000, changeRate: 0.01 },
    { symbol: "ETH", price: 5_000_000, changeRate: -0.02 },
  ],
  asOf: 1_700_000_000_000,
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("simulator API", () => {
  it("sends the access token when loading state", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify(state), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(getSimulatorState("access-token")).resolves.toEqual(state);
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/simulator/state",
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: "Bearer access-token" }),
      }),
    );
  });

  it("serializes a market order", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify(state), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }));
    vi.stubGlobal("fetch", fetchMock);

    await executeSimulatorOrder("token", { symbol: "ETH", side: "buy", quantity: 1.5 });

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/simulator/order",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ symbol: "ETH", side: "buy", quantity: 1.5 }),
      }),
    );
  });

  it("preserves a server domain error", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({
      error: { code: "INSUFFICIENT_CASH", message: "주문 가능한 현금이 부족합니다." },
    }), {
      status: 409,
      headers: { "Content-Type": "application/json" },
    })));

    const error = await getSimulatorState("token").catch((cause: unknown) => cause);

    expect(error).toBeInstanceOf(SimulatorApiError);
    expect(error).toMatchObject({ code: "INSUFFICIENT_CASH", status: 409 });
  });
});
