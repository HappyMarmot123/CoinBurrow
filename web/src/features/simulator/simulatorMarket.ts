import type { SimulatorSymbol } from "../../api/simulator.js";

const SIMULATOR_SYMBOL_BY_MARKET: Readonly<Record<string, SimulatorSymbol>> = {
  "KRW-BTC": "BTC",
  "KRW-ETH": "ETH",
};

export function toSimulatorSymbol(market: string): SimulatorSymbol | null {
  return SIMULATOR_SYMBOL_BY_MARKET[market] ?? null;
}
