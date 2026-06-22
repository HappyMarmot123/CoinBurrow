import { type Observable, merge } from "rxjs";
import { filter, map, groupBy, mergeMap, bufferTime, throttleTime, share } from "rxjs/operators";
import type { Channel, WorkerResponse } from "./protocol.js";
import { parseWithSchema } from "../shared/validation/parse.js";
import { schemaForUpbitMessage } from "../shared/validation/schemas/ws/upbit.js";
import type { NormalizedError } from "../shared/validation/error/normalized-error.js";

type ParsedUpbitMessage =
  | { kind: "item"; channel: Channel; item: any }
  | { kind: "error"; error: NormalizedError }
  | null;

export function normalizeUpbit(raw: any): { channel: Channel; item: any } | null {
  const parsed = parseUpbitMessage(raw);
  return parsed?.kind === "item" ? { channel: parsed.channel, item: parsed.item } : null;
}

function parseUpbitMessage(raw: any): ParsedUpbitMessage {
  const type: string = raw?.type ?? "";
  const schema = schemaForUpbitMessage(type);

  if (!schema) {
    return null;
  }

  const parsed = parseWithSchema(schema, raw, "websocket");
  if (!parsed.ok) {
    return { kind: "error", error: parsed.error };
  }

  const market = raw.code ?? raw.market;

  if (type === "ticker") {
    return {
      kind: "item",
      channel: "ticker",
      item: {
        market,
        tradePrice: raw.trade_price,
        signedChangeRate: raw.signed_change_rate,
        accTradePrice24h: raw.acc_trade_price_24h,
      },
    };
  }

  if (type === "orderbook") {
    return {
      kind: "item",
      channel: "orderbook",
      item: {
        market,
        timestamp: raw.timestamp,
        units: (raw.orderbook_units ?? []).map((unit: any) => ({
          askPrice: unit.ask_price,
          bidPrice: unit.bid_price,
          askSize: unit.ask_size,
          bidSize: unit.bid_size,
        })),
      },
    };
  }

  if (type.startsWith("candle")) {
    return {
      kind: "item",
      channel: "candle",
      item: {
        market,
        timestamp: raw.timestamp,
        open: raw.opening_price,
        high: raw.high_price,
        low: raw.low_price,
        close: raw.trade_price,
        volume: raw.candle_acc_trade_volume,
      },
    };
  }

  if (type === "trade") {
    return {
      kind: "item",
      channel: "trade",
      item: {
        market,
        price: raw.trade_price,
        volume: raw.trade_volume,
        side: raw.ask_bid,
        timestamp: raw.timestamp,
      },
    };
  }

  return null;
}

export function createOutputStream(raw$: Observable<any>): Observable<WorkerResponse> {
  const parsed$ = raw$.pipe(map(parseUpbitMessage), share());
  const validationError$ = parsed$.pipe(
    filter((value): value is Extract<ParsedUpbitMessage, { kind: "error" }> => value?.kind === "error"),
    map((value) => ({ type: "validation-error" as const, error: value.error })),
  );
  const normalized$ = parsed$.pipe(
    filter((value): value is Extract<ParsedUpbitMessage, { kind: "item" }> => value?.kind === "item"),
    map((value) => ({ channel: value.channel, item: value.item })),
  );

  const ticker$ = normalized$.pipe(
    filter((value) => value.channel === "ticker"),
    bufferTime(100),
    filter((batch) => batch.length > 0),
    map((batch) => {
      const latest = new Map<string, any>();
      batch.forEach((value) => latest.set(value.item.market, value.item));
      return { type: "ticker" as Channel, data: [...latest.values()] };
    }),
  );

  const otherChannels$ = normalized$.pipe(
    filter((value) => value.channel !== "ticker"),
    groupBy((value) => value.channel),
    mergeMap((group) =>
      group.pipe(
        throttleTime(100, undefined, { leading: true, trailing: true }),
        map((value) => ({ type: value.channel, data: [value.item] })),
      ),
    ),
  );

  return merge(ticker$, otherChannels$, validationError$);
}
