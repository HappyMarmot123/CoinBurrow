import { type Observable } from "rxjs";
import { filter, map, bufferTime } from "rxjs/operators";
import { binanceMiniTickerSchema } from "../shared/validation/schemas/ws/binance.js";
import type { BinancePriceUpdate, BinanceWorkerResponse } from "./binanceProtocol.js";

export function normalizeBinance(raw: unknown): BinancePriceUpdate | null {
  const parsed = binanceMiniTickerSchema.safeParse(raw);
  if (!parsed.success) return null;

  const price = Number(parsed.data.data.c);
  if (!Number.isFinite(price)) return null;

  return { symbol: parsed.data.data.s.toUpperCase(), price };
}

export function createBinanceOutputStream(
  raw$: Observable<unknown>,
): Observable<BinanceWorkerResponse> {
  return raw$.pipe(
    map(normalizeBinance),
    filter((value): value is BinancePriceUpdate => value !== null),
    bufferTime(100),
    filter((batch) => batch.length > 0),
    map((batch) => {
      const latest = new Map<string, BinancePriceUpdate>();
      batch.forEach((update) => latest.set(update.symbol, update));
      return { type: "binance-ticker" as const, data: [...latest.values()] };
    }),
  );
}
