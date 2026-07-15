import { z } from "zod";

const simulatorSymbolSchema = z.enum(["BTC", "ETH"]);
const marketQuoteSchema = z.object({
  symbol: simulatorSymbolSchema,
  price: z.number().positive(),
  changeRate: z.number(),
});
const simulatorPositionSchema = z.object({
  symbol: simulatorSymbolSchema,
  quantity: z.number().positive(),
  avgPrice: z.number().positive(),
  currentPrice: z.number().positive(),
  marketValue: z.number().nonnegative(),
  profit: z.number(),
  returnRate: z.number(),
});
const simulatorStateSchema = z.object({
  account: z.object({
    startingCash: z.number().positive(),
    cashBalance: z.number().nonnegative(),
    investedValue: z.number().nonnegative(),
    totalAsset: z.number().nonnegative(),
    totalProfit: z.number(),
    returnRate: z.number(),
  }),
  positions: z.array(simulatorPositionSchema),
  purchasedSymbols: z.array(simulatorSymbolSchema),
  quotes: z.array(marketQuoteSchema),
  asOf: z.number(),
});
const apiErrorSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
  }),
});

export type SimulatorSymbol = z.infer<typeof simulatorSymbolSchema>;
export type MarketQuote = z.infer<typeof marketQuoteSchema>;
export type SimulatorPosition = z.infer<typeof simulatorPositionSchema>;
export type SimulatorState = z.infer<typeof simulatorStateSchema>;
export type SimulatorAccount = SimulatorState["account"];
export type OrderSide = "buy" | "sell";

export interface SimulatorOrderInput {
  symbol: SimulatorSymbol;
  side: OrderSide;
  quantity: number;
}

export class SimulatorApiError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "SimulatorApiError";
  }
}

const API_ORIGIN = import.meta.env.VITE_API_ORIGIN?.trim().replace(/\/+$/, "");

function endpoint(path: string): string {
  return API_ORIGIN ? `${API_ORIGIN}${path}` : path;
}

async function requestState(
  path: string,
  accessToken: string,
  init: RequestInit = {},
): Promise<SimulatorState> {
  let response: Response;
  try {
    response = await fetch(endpoint(path), {
      ...init,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
        ...init.headers,
      },
    });
  } catch {
    throw new SimulatorApiError("NETWORK_ERROR", "서버에 연결하지 못했습니다.", 0);
  }

  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const parsedError = apiErrorSchema.safeParse(body);
    throw new SimulatorApiError(
      parsedError.success ? parsedError.data.error.code : "REQUEST_FAILED",
      parsedError.success ? parsedError.data.error.message : "요청을 처리하지 못했습니다.",
      response.status,
    );
  }

  const parsedState = simulatorStateSchema.safeParse(body);
  if (!parsedState.success) {
    throw new SimulatorApiError(
      "INVALID_RESPONSE",
      "서버 응답 형식이 올바르지 않습니다.",
      response.status,
    );
  }
  return parsedState.data;
}

export function getSimulatorState(accessToken: string): Promise<SimulatorState> {
  return requestState("/api/simulator/state", accessToken);
}

export function executeSimulatorOrder(
  accessToken: string,
  input: SimulatorOrderInput,
): Promise<SimulatorState> {
  return requestState("/api/simulator/order", accessToken, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function resetSimulator(accessToken: string): Promise<SimulatorState> {
  return requestState("/api/simulator/reset", accessToken, { method: "POST" });
}
